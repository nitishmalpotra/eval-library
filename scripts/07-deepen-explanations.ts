import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";

type DeepenStats = {
  inputTokens: number;
  outputTokens: number;
};

// Explanations shorter than this (chars) get expanded. The extraction step (02)
// sometimes writes one-sentence explanations; this pass grows them to 2-3
// grounded paragraphs. NOTE: explanation is part of the embedding text, so run
// `npm run extract:embed` after this to keep vectors in sync.
const lengthThreshold = 300;
const concurrency = 5;
const retryDelayMs = 5_000;
const inputCostPerMillionTokens = 0.27;
const outputCostPerMillionTokens = 1.1;

const evalPatternSchema = z
  .object({
    name: z.string(),
    definition: z.string(),
    explanation: z.string(),
    when_to_use: z.array(z.string()),
    when_not_to_use: z.array(z.string()),
    metric_or_method: z.string(),
    source_excerpt: z.string(),
  })
  .passthrough();

type EvalPattern = z.infer<typeof evalPatternSchema>;

const responseSchema = z.object({ explanation: z.string().min(250).max(1400) });

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

function buildPrompt(pattern: EvalPattern): string {
  return `You are deepening the explanation of one entry in a curated AI evaluation pattern library. The current explanation is too short. Rewrite it as 2-3 short paragraphs (roughly 450-800 characters) that a product manager can actually learn from.

STRICT RULES:
- Use ONLY information supported by the fields below — especially the verbatim source_excerpt. Do not invent numbers, names, tools, or claims not present.
- Explain what the pattern is, how it works in practice, and why it matters. Stay concrete.
- Plain language, active voice. No marketing fluff. Do not restate the one_liner.
- Return JSON: { "explanation": "..." }

PATTERN: ${pattern.name}
definition: ${pattern.definition}
current explanation: ${pattern.explanation}
when_to_use: ${JSON.stringify(pattern.when_to_use)}
when_not_to_use: ${JSON.stringify(pattern.when_not_to_use)}
metric_or_method: ${pattern.metric_or_method}
source_excerpt (verbatim, your ground truth): ${pattern.source_excerpt}`;
}

function parseResponse(content: string | null): string {
  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  return responseSchema.parse(JSON.parse(content)).explanation;
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

async function deepenPattern(
  client: OpenAI,
  pattern: EvalPattern,
): Promise<{ explanation: string; stats: DeepenStats }> {
  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model:
        process.env.DEEPSEEK_MODEL_PIPELINE ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
      messages: [{ role: "user", content: buildPrompt(pattern) }],
      response_format: { type: "json_object" },
    });

    return {
      explanation: parseResponse(response.choices[0]?.message.content ?? null),
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
  const backupPath = path.join(process.cwd(), "data", "evals.pre-deepen.json");
  const patterns = z
    .array(evalPatternSchema)
    .parse(JSON.parse(await readFile(dataPath, "utf8")));

  const targets = patterns
    .map((pattern, index) => ({ pattern, index }))
    .filter((target) => target.pattern.explanation.length < lengthThreshold);

  if (targets.length === 0) {
    console.log(`Nothing to deepen — all explanations are >= ${lengthThreshold} chars.`);
    return;
  }

  const client = new OpenAI({
    apiKey: getRequiredEnv("DEEPSEEK_API_KEY"),
    baseURL: "https://api.deepseek.com/v1",
  });
  const updated = [...patterns];
  const totalStats: DeepenStats = { inputTokens: 0, outputTokens: 0 };
  let failures = 0;

  console.log(`Deepening ${targets.length} explanations under ${lengthThreshold} chars...`);

  await runBatch(targets, concurrency, async (target, position) => {
    try {
      const result = await deepenPattern(client, target.pattern);
      const before = target.pattern.explanation.length;

      updated[target.index] = { ...target.pattern, explanation: result.explanation };
      totalStats.inputTokens += result.stats.inputTokens;
      totalStats.outputTokens += result.stats.outputTokens;

      console.log(
        `[${position + 1}/${targets.length}] ✓ ${target.pattern.name} (${before} → ${result.explanation.length} chars)`,
      );
    } catch (error: unknown) {
      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[${position + 1}/${targets.length}] ✗ ${target.pattern.name} → ${message}`);
    }
  });

  await copyFile(dataPath, backupPath);
  await writeFile(dataPath, `${JSON.stringify(updated, null, 2)}\n`);

  const stillThin = updated.filter(
    (pattern) => pattern.explanation.length < lengthThreshold,
  ).length;
  const estimatedCost =
    (totalStats.inputTokens / 1_000_000) * inputCostPerMillionTokens +
    (totalStats.outputTokens / 1_000_000) * outputCostPerMillionTokens;

  console.log(`Deepened: ${targets.length - failures}, failed: ${failures}`);
  console.log(`Explanations still under ${lengthThreshold} chars: ${stillThin}`);
  console.log(
    `Estimated cost: $${estimatedCost.toFixed(4)} (${totalStats.inputTokens} input tokens, ${totalStats.outputTokens} output tokens).`,
  );
  console.log("Reminder: run `npm run extract:embed` to refresh embeddings.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
