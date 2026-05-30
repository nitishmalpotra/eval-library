import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";

type BackfillStats = {
  inputTokens: number;
  outputTokens: number;
};

const concurrency = 5;
const retryDelayMs = 5_000;
const inputCostPerMillionTokens = 0.27;
const outputCostPerMillionTokens = 1.1;

// Bullet-list fields the extraction step (02) occasionally leaves empty. This
// script regenerates ONLY those, grounded in the pattern's already-curated
// content. Note: it synthesizes from the curated fields + source_excerpt, not
// from the original transcript, so backfilled bullets are inferred rather than
// extracted verbatim.
const backfillableFields = ["when_not_to_use", "common_pitfalls"] as const;
type BackfillField = (typeof backfillableFields)[number];

const fieldGuidance: Record<BackfillField, string> = {
  when_not_to_use: "concrete scenarios where this pattern is the WRONG choice",
  common_pitfalls: "common mistakes practitioners make when applying this pattern",
};

const evalPatternSchema = z
  .object({
    name: z.string(),
    definition: z.string(),
    explanation: z.string(),
    when_to_use: z.array(z.string()),
    when_not_to_use: z.array(z.string()),
    metric_or_method: z.string(),
    common_pitfalls: z.array(z.string()),
    source_excerpt: z.string(),
  })
  .passthrough();

type EvalPattern = z.infer<typeof evalPatternSchema>;

const bulletListSchema = z.array(z.string().min(8)).min(2).max(4);

async function loadLocalEnv(): Promise<void> {
  const envPath = path.join(process.cwd(), ".env.local");

  try {
    const envFile = await readFile(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");

      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] ??= value;
    }
  } catch (error: unknown) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;

    if (code !== "ENOENT") {
      throw error;
    }
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} env var is required.`);
  }

  return value;
}

function missingFields(pattern: EvalPattern): BackfillField[] {
  return backfillableFields.filter((field) => pattern[field].length === 0);
}

function buildPrompt(pattern: EvalPattern, fields: BackfillField[]): string {
  const context = {
    name: pattern.name,
    definition: pattern.definition,
    explanation: pattern.explanation,
    when_to_use: pattern.when_to_use,
    metric_or_method: pattern.metric_or_method,
    source_excerpt: pattern.source_excerpt,
  };

  const requested = fields
    .map((field) => `- ${field}: 2-4 bullets — ${fieldGuidance[field]}`)
    .join("\n");
  const outputShape = fields
    .map((field) => `"${field}": ["...", "..."]`)
    .join(", ");

  return `You are completing one entry in a curated AI PM eval library. The pattern below is already human-reviewed, but some bullet lists are empty. Write ONLY the requested missing field(s). Stay strictly faithful to this pattern — do not introduce scope the definition and explanation do not support. Keep bullets concise and specific. Return JSON.

PATTERN:
${JSON.stringify(context, null, 2)}

WRITE THESE FIELD(S):
${requested}

OUTPUT JSON (only the requested key(s)):
{ ${outputShape} }`;
}

function parseResponse(
  content: string | null,
  fields: BackfillField[],
): Record<BackfillField, string[]> {
  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  const raw = JSON.parse(content) as Record<string, unknown>;
  const result = {} as Record<BackfillField, string[]>;

  for (const field of fields) {
    result[field] = bulletListSchema.parse(raw[field]);
  }

  return result;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await delay(retryDelayMs);
    return fn();
  }
}

async function backfillPattern(
  client: OpenAI,
  pattern: EvalPattern,
  fields: BackfillField[],
): Promise<{ filled: Record<BackfillField, string[]>; stats: BackfillStats }> {
  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model:
        process.env.DEEPSEEK_MODEL_PIPELINE ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
      messages: [{ role: "user", content: buildPrompt(pattern, fields) }],
      response_format: { type: "json_object" },
    });

    return {
      filled: parseResponse(response.choices[0]?.message.content ?? null, fields),
      stats: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  });
}

async function runBatch<T>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  for (let offset = 0; offset < items.length; offset += batchSize) {
    const batch = items.slice(offset, offset + batchSize);
    await Promise.all(batch.map((item, index) => fn(item, offset + index)));
  }
}

async function main(): Promise<void> {
  await loadLocalEnv();

  const dataPath = path.join(process.cwd(), "data", "evals.json");
  const backupPath = path.join(process.cwd(), "data", "evals.pre-backfill.json");
  const patterns = z
    .array(evalPatternSchema)
    .parse(JSON.parse(await readFile(dataPath, "utf8")));

  const targets = patterns
    .map((pattern, index) => ({ pattern, index, fields: missingFields(pattern) }))
    .filter((target) => target.fields.length > 0);

  if (targets.length === 0) {
    console.log("Nothing to backfill — all patterns already have these fields.");
    return;
  }

  const client = new OpenAI({
    apiKey: getRequiredEnv("DEEPSEEK_API_KEY"),
    baseURL: "https://api.deepseek.com/v1",
  });
  const updated = [...patterns];
  const totalStats: BackfillStats = { inputTokens: 0, outputTokens: 0 };
  let failures = 0;

  await runBatch(targets, concurrency, async (target, position) => {
    try {
      const result = await backfillPattern(client, target.pattern, target.fields);

      updated[target.index] = { ...target.pattern, ...result.filled };
      totalStats.inputTokens += result.stats.inputTokens;
      totalStats.outputTokens += result.stats.outputTokens;

      console.log(
        `[${position + 1}/${targets.length}] ✓ ${target.pattern.name} → ${target.fields.join(", ")}`,
      );
    } catch (error: unknown) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[${position + 1}/${targets.length}] ✗ ${target.pattern.name} → ${message}`);
    }
  });

  await copyFile(dataPath, backupPath);
  await writeFile(dataPath, `${JSON.stringify(updated, null, 2)}\n`);

  const stillEmpty = updated.filter((pattern) => missingFields(pattern).length > 0).length;
  const estimatedCost =
    (totalStats.inputTokens / 1_000_000) * inputCostPerMillionTokens +
    (totalStats.outputTokens / 1_000_000) * outputCostPerMillionTokens;

  console.log(`Patterns needing backfill: ${targets.length}`);
  console.log(`Backfilled: ${targets.length - failures}, failed: ${failures}`);
  console.log(`Patterns still missing a field: ${stillEmpty}`);
  console.log(
    `Estimated cost: $${estimatedCost.toFixed(4)} (${totalStats.inputTokens} input tokens, ${totalStats.outputTokens} output tokens).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
