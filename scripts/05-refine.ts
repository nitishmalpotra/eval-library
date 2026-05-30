import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";

type RefinementStats = {
  inputTokens: number;
  outputTokens: number;
};

const concurrency = 5;
const retryDelayMs = 5_000;
const inputCostPerMillionTokens = 0.27;
const outputCostPerMillionTokens = 1.1;

const featureTypeSchema = z.enum([
  "chatbot",
  "agent",
  "rag",
  "classification",
  "summarization",
  "code_generation",
  "search_ranking",
  "multimodal",
  "general",
]);

const evalPatternSchema = z
  .object({
    name: z.string(),
    one_liner: z.string(),
    category: z.enum(["methodology", "metric", "process", "framework"]),
    feature_types: z.array(featureTypeSchema),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]),
    definition: z.string(),
    explanation: z.string(),
    when_to_use: z.array(z.string()),
    metric_or_method: z.string(),
    source_excerpt: z.string(),
    codex_prompt_template: z.string(),
    curation_status: z.enum(["auto", "verified", "edited"]),
  })
  .passthrough();

const refinementSchema = z.object({
  one_liner: z.string().max(119),
  codex_prompt_template: z.string(),
  feature_types: z.array(featureTypeSchema).min(1).max(3),
});

type EvalPattern = z.infer<typeof evalPatternSchema>;
type Refinement = z.infer<typeof refinementSchema>;

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
  const currentPattern = {
    name: pattern.name,
    category: pattern.category,
    difficulty: pattern.difficulty,
    definition: pattern.definition,
    explanation: pattern.explanation,
    when_to_use: pattern.when_to_use,
    metric_or_method: pattern.metric_or_method,
    source_excerpt: pattern.source_excerpt,
  };

  return `You are refining one eval pattern from a curated AI PM eval library. The current entry has three weak fields. Refine ONLY these three fields. Do not change any other field. Return JSON.

CURRENT PATTERN:
${JSON.stringify(currentPattern, null, 2)}

REFINE THESE THREE FIELDS:

1. one_liner — Punchy hook for a card. MUST be under 120 chars. Should hint at the technique, not just describe it abstractly. Active voice. Use the existing definition + explanation as input.

2. codex_prompt_template — A copy-pasteable prompt for Codex/Cursor/Claude Code. MUST contain at least one [PLACEHOLDER] in square brackets that the user fills in (e.g., [FEATURE_DESCRIPTION], [TRACE], [DATASET_SIZE], [FAILURE_MODE]). Should be specific enough that pasting it into Codex produces useful eval code or analysis. If the pattern is purely conceptual (e.g., a governance principle that can't be expressed as a Codex task), set this field to empty string "".

3. feature_types — Pick 1-3 SPECIFIC types from this list: chatbot, agent, rag, classification, summarization, code_generation, search_ranking, multimodal. Only include 'general' if the pattern truly applies to every AI feature type AND you didn't find a more specific fit. Most patterns should NOT have 'general' in the list.

OUTPUT JSON:
{ "one_liner": "...", "codex_prompt_template": "...", "feature_types": ["..."] }`;
}

// The model is asked for a one_liner under 120 chars but occasionally
// overshoots. Rather than failing the whole run on one long hook, clamp it to
// the limit at a word boundary.
function clampOneLiner(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 119) {
    return trimmed;
  }

  const cut = trimmed.slice(0, 118);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;

  return `${base.trimEnd()}…`;
}

function parseResponse(content: string | null): Refinement {
  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  const raw = JSON.parse(content) as Record<string, unknown>;

  if (typeof raw.one_liner === "string") {
    raw.one_liner = clampOneLiner(raw.one_liner);
  }

  return refinementSchema.parse(raw);
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

async function refinePattern(
  client: OpenAI,
  pattern: EvalPattern,
): Promise<{ refinement: Refinement; stats: RefinementStats }> {
  return withRetry(async () => {
    const response = await client.chat.completions.create({
      model:
        process.env.DEEPSEEK_MODEL_PIPELINE ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
      messages: [{ role: "user", content: buildPrompt(pattern) }],
      response_format: { type: "json_object" },
    });

    return {
      refinement: parseResponse(response.choices[0]?.message.content ?? null),
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

function hasPlaceholder(value: string): boolean {
  return /\[[^\[\]]+\]/.test(value);
}

async function main(): Promise<void> {
  await loadLocalEnv();

  const dataPath = path.join(process.cwd(), "data", "evals.json");
  const backupPath = path.join(process.cwd(), "data", "evals.pre-refine.json");
  const rawPatterns = JSON.parse(await readFile(dataPath, "utf8")) as unknown;
  const patterns = z.array(evalPatternSchema).parse(rawPatterns);
  const client = new OpenAI({
    apiKey: getRequiredEnv("DEEPSEEK_API_KEY"),
    baseURL: "https://api.deepseek.com/v1",
  });
  const refinedPatterns = [...patterns];
  const totalStats: RefinementStats = { inputTokens: 0, outputTokens: 0 };

  await runBatch(patterns, concurrency, async (pattern, index) => {
    const result = await refinePattern(client, pattern);

    refinedPatterns[index] = {
      ...pattern,
      ...result.refinement,
      curation_status: "edited",
    };
    totalStats.inputTokens += result.stats.inputTokens;
    totalStats.outputTokens += result.stats.outputTokens;

    console.log(`[${index + 1}/${patterns.length}] ✓ ${pattern.name}`);
  });

  await copyFile(dataPath, backupPath);
  await writeFile(dataPath, `${JSON.stringify(refinedPatterns, null, 2)}\n`);

  const oneLinersUnder120 = refinedPatterns.filter(
    (pattern) => pattern.one_liner.length < 120,
  ).length;
  const promptsWithPlaceholder = refinedPatterns.filter((pattern) =>
    hasPlaceholder(pattern.codex_prompt_template),
  ).length;
  const generalFeatureTypes = refinedPatterns.filter((pattern) =>
    pattern.feature_types.includes("general"),
  ).length;
  const estimatedCost =
    (totalStats.inputTokens / 1_000_000) * inputCostPerMillionTokens +
    (totalStats.outputTokens / 1_000_000) * outputCostPerMillionTokens;

  console.log(`Patterns refined: ${refinedPatterns.length}`);
  console.log(`one_liner under 120 chars: ${oneLinersUnder120}`);
  console.log(`codex_prompt_template with [PLACEHOLDER]: ${promptsWithPlaceholder}`);
  console.log(`patterns with 'general' in feature_types: ${generalFeatureTypes}`);
  console.log(
    `Estimated cost: $${estimatedCost.toFixed(4)} (${totalStats.inputTokens} input tokens, ${totalStats.outputTokens} output tokens).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
