import { copyFile, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getOpenRouter, models, pipelineTimeoutMs, usageCostUsd } from "../src/lib/openrouter";

type DeepenStats = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

// Explanations shorter than this (chars) get expanded. The extraction step (02)
// sometimes writes one-sentence explanations; this pass grows them to 2-3
// grounded paragraphs. NOTE: explanation is part of the embedding text, so run
// `npm run extract:embed` after this to keep vectors in sync.
const lengthThreshold = 300;
const concurrency = 5;
const retryDelayMs = 5_000;

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
    throw new Error("The model returned an empty response.");
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
  pattern: EvalPattern,
): Promise<{ explanation: string; stats: DeepenStats }> {
  return withRetry(async () => {
    const response = await getOpenRouter().chat.completions.create(
      {
        model: models.pipeline,
        messages: [{ role: "user", content: buildPrompt(pattern) }],
        response_format: { type: "json_object" },
        // Reasoning can consume a small cap and leave empty content.
        max_tokens: 32_000,
      },
      { timeout: pipelineTimeoutMs },
    );

    return {
      explanation: parseResponse(response.choices[0]?.message.content ?? null),
      stats: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        costUsd: usageCostUsd(response.usage),
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

  const updated = [...patterns];
  const totalStats: DeepenStats = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  let failures = 0;

  console.log(`Deepening ${targets.length} explanations under ${lengthThreshold} chars...`);

  await runBatch(targets, concurrency, async (target, position) => {
    try {
      const result = await deepenPattern(target.pattern);
      const before = target.pattern.explanation.length;

      updated[target.index] = { ...target.pattern, explanation: result.explanation };
      totalStats.inputTokens += result.stats.inputTokens;
      totalStats.outputTokens += result.stats.outputTokens;
      totalStats.costUsd += result.stats.costUsd;

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

  console.log(`Deepened: ${targets.length - failures}, failed: ${failures}`);
  console.log(`Explanations still under ${lengthThreshold} chars: ${stillThin}`);
  console.log(
    `Cost: $${totalStats.costUsd.toFixed(4)} (${totalStats.inputTokens} input tokens, ${totalStats.outputTokens} output tokens).`,
  );
  console.log("Reminder: run `npm run extract:embed` to refresh embeddings.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
