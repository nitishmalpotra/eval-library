import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getOpenRouter, models, pipelineTimeoutMs, usageCostUsd } from "../src/lib/openrouter";
import { assertBudget, recordSpend } from "./lib/llm";

const batchSize = 100;

const evalPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  one_liner: z.string(),
  definition: z.string(),
  explanation: z.string(),
  when_to_use: z.array(z.string()),
  keywords: z.array(z.string()),
  feature_types: z.array(z.string()),
});

const evalPatternsSchema = z.array(evalPatternSchema);

type EvalPattern = z.infer<typeof evalPatternSchema>;

function buildEmbeddingText(pattern: EvalPattern): string {
  return [
    pattern.name,
    pattern.one_liner,
    pattern.definition,
    pattern.explanation.slice(0, 1_000),
    `When to use: ${pattern.when_to_use.join("; ")}`,
    pattern.keywords.join(", "),
    pattern.feature_types.join(", "),
  ].join("\n");
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function main(): Promise<void> {
  const evalsPath = path.join(process.cwd(), "data", "evals.json");
  const outputPath = path.join(process.cwd(), "data", "eval-embeddings.json");
  const evalsJson = JSON.parse(await readFile(evalsPath, "utf8"));
  const patterns = evalPatternsSchema.parse(evalsJson);

  const vectors: Array<{ id: string; vector: number[] }> = [];
  let totalTokens = 0;
  let costUsd = 0;
  let dimension = 0;

  for (const batch of chunk(patterns, batchSize)) {
    await assertBudget();
    const response = await getOpenRouter().embeddings.create(
      {
        model: models.embed,
        input: batch.map(buildEmbeddingText),
      },
      { timeout: pipelineTimeoutMs },
    );

    const batchCost = usageCostUsd(response.usage);
    totalTokens += response.usage.total_tokens;
    costUsd += batchCost;
    await recordSpend(batchCost);

    if (response.data.length !== batch.length) {
      throw new Error(
        `Expected ${batch.length} embeddings, received ${response.data.length}.`,
      );
    }

    for (const [index, embedding] of response.data.entries()) {
      if (dimension === 0) {
        dimension = embedding.embedding.length;
      }

      if (embedding.embedding.length !== dimension) {
        throw new Error(
          `Unexpected vector length for ${batch[index].id}: ${embedding.embedding.length}.`,
        );
      }

      vectors.push({
        id: batch[index].id,
        vector: embedding.embedding.map((value) => Number(value.toFixed(6))),
      });
    }
  }

  const output = {
    model: models.embed,
    dimension,
    generated_at: new Date().toISOString(),
    vectors,
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`Embedded ${vectors.length} patterns.`);
  console.log(`Vector dimension: ${dimension}.`);
  console.log(`Tokens: ${totalTokens}.`);
  console.log(`Cost: $${costUsd.toFixed(6)}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
