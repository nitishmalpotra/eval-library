import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { z } from "zod";

const model = "text-embedding-3-small";
const dimension = 1_536;
const batchSize = 100;
const costPerMillionTokensUsd = 0.02;

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
  await loadLocalEnv();

  const evalsPath = path.join(process.cwd(), "data", "evals.json");
  const outputPath = path.join(process.cwd(), "data", "eval-embeddings.json");
  const evalsJson = JSON.parse(await readFile(evalsPath, "utf8"));
  const patterns = evalPatternsSchema.parse(evalsJson);
  const client = new OpenAI({ apiKey: getRequiredEnv("OPENAI_API_KEY") });

  const vectors: Array<{ id: string; vector: number[] }> = [];
  let totalTokens = 0;

  for (const batch of chunk(patterns, batchSize)) {
    const response = await client.embeddings.create({
      model,
      input: batch.map(buildEmbeddingText),
    });

    totalTokens += response.usage.total_tokens;

    if (response.data.length !== batch.length) {
      throw new Error(
        `Expected ${batch.length} embeddings, received ${response.data.length}.`,
      );
    }

    for (const [index, embedding] of response.data.entries()) {
      if (embedding.embedding.length !== dimension) {
        throw new Error(
          `Unexpected vector length for ${batch[index].id}: ${embedding.embedding.length}.`,
        );
      }

      vectors.push({
        id: batch[index].id,
        vector: embedding.embedding,
      });
    }
  }

  const output = {
    model,
    dimension,
    generated_at: new Date().toISOString(),
    vectors,
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  const estimatedCostUsd = (totalTokens / 1_000_000) * costPerMillionTokensUsd;

  console.log(`Embedded ${vectors.length} patterns.`);
  console.log(`Vector dimension: ${dimension}.`);
  console.log(`Tokens: ${totalTokens}.`);
  console.log(`Estimated cost: $${estimatedCostUsd.toFixed(6)}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
