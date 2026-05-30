import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import OpenAI from "openai";
import { z } from "zod";

type SourceFile = {
  file: string;
  title: string;
  date: string;
  guest: string;
  word_count: number;
};

type FilesToProcess = {
  tier1: SourceFile[];
  tier2: Array<SourceFile & { eval_mention_count: number }>;
};

type ExtractionStats = {
  inputTokens: number;
  outputTokens: number;
};

const concurrency = 3;
const maxBodyChars = 50_000;
const targetChunkChars = 30_000;
const retryDelayMs = 5_000;

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

const evalPatternSchema = z.object({
  name: z.string(),
  one_liner: z.string(),
  category: z.enum(["methodology", "metric", "process", "framework"]),
  feature_types: z.array(featureTypeSchema),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  definition: z.string(),
  explanation: z.string(),
  when_to_use: z.array(z.string()),
  when_not_to_use: z.array(z.string()),
  metric_or_method: z.string(),
  common_pitfalls: z.array(z.string()),
  source_excerpt: z.string(),
  codex_prompt_template: z.string(),
  keywords: z.array(z.string()),
});

const responseSchema = z.object({
  patterns: z.array(evalPatternSchema),
});

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

const extractionPrompt = `You are an expert AI Product Manager and technical writer. You are reading an interview transcript or newsletter from Lenny Rachitsky's publication. Your job is to extract every distinct AI EVALUATION PATTERN discussed in the text.

An "eval pattern" is a named, reusable approach for evaluating an AI product or feature. It can be a methodology (e.g., "LLM-as-a-Judge"), a metric (e.g., "TPR/TNR on a labeled set"), a process (e.g., "Error analysis before metrics"), or a framework ("Three-stage eval pipeline").

For each pattern in the text, output a JSON object matching this schema:

{
  "name": string,
  "one_liner": string,
  "category": "methodology" | "metric" | "process" | "framework",
  "feature_types": ["chatbot" | "agent" | "rag" | "classification" | "summarization" | "code_generation" | "search_ranking" | "multimodal" | "general"],
  "difficulty": "beginner" | "intermediate" | "advanced",
  "definition": string,
  "explanation": string,
  "when_to_use": string[],
  "when_not_to_use": string[],
  "metric_or_method": string,
  "common_pitfalls": string[],
  "source_excerpt": string,
  "codex_prompt_template": string,
  "keywords": string[]
}

RULES:
- Only extract patterns substantively discussed (not just name-dropped). If a term is mentioned in passing with no explanation, skip it.
- Be faithful: every claim must come from the text. No inventing.
- Source excerpts must be verbatim from the input. Mark elided text with [...].
- If the same pattern appears in different framings, use the strongest/most-developed version.
- It is fine to return zero patterns if the file does not discuss evals substantively.
- Output a JSON object with this exact shape: { "patterns": [...] }. No prose around it.

INPUT FILE METADATA:
__METADATA__

INPUT TEXT:
__BODY__

OUTPUT:`;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} env var is required.`);
  }

  return value;
}

function fileId(file: string): string {
  return file.replace(/\.md$/, "").replaceAll("/", "__");
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return undefined;
}

function buildMetadata(file: SourceFile, frontmatter: Record<string, unknown>) {
  return {
    file: file.file,
    guest_or_author:
      asString(frontmatter.guest) ??
      asString(frontmatter.author) ??
      asString(frontmatter.authors) ??
      file.guest,
    title: asString(frontmatter.title) ?? file.title,
    date: asString(frontmatter.date) ?? file.date,
  };
}

function chunkBody(body: string): string[] {
  if (body.length <= maxBodyChars) {
    return [body];
  }

  const chunks: string[] = [];
  let current = "";

  for (const line of body.split(/\r?\n/)) {
    const lineWithBreak = `${line}\n`;
    const startsSpeakerBlock = line.startsWith("**");

    if (
      current.length > 0 &&
      startsSpeakerBlock &&
      current.length + lineWithBreak.length > targetChunkChars
    ) {
      chunks.push(current.trim());
      current = "";
    }

    if (
      current.length > 0 &&
      current.length + lineWithBreak.length > targetChunkChars * 1.4
    ) {
      chunks.push(current.trim());
      current = "";
    }

    current += lineWithBreak;
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

function buildUserMessage(
  metadata: ReturnType<typeof buildMetadata>,
  body: string,
  chunkIndex: number,
  chunkCount: number,
): string {
  const metadataWithChunk =
    chunkCount === 1
      ? metadata
      : { ...metadata, chunk: `${chunkIndex + 1} of ${chunkCount}` };

  return extractionPrompt
    .replace("__METADATA__", JSON.stringify(metadataWithChunk))
    .replace("__BODY__", body);
}

function parseResponse(content: string | null): EvalPattern[] {
  if (!content) {
    throw new Error("DeepSeek returned an empty response.");
  }

  const parsed: unknown = JSON.parse(content);
  return responseSchema.parse(parsed).patterns;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractChunk(
  client: OpenAI,
  message: string,
): Promise<{ patterns: EvalPattern[]; stats: ExtractionStats }> {
  const response = await client.chat.completions.create({
    model:
      process.env.DEEPSEEK_MODEL_PIPELINE ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
    messages: [{ role: "user", content: message }],
    response_format: { type: "json_object" },
  });

  return {
    patterns: parseResponse(response.choices[0]?.message.content ?? null),
    stats: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await delay(retryDelayMs);
    return fn();
  }
}

async function processFile(
  client: OpenAI,
  corpusPath: string,
  outputDir: string,
  file: SourceFile,
): Promise<{ patterns: number; stats: ExtractionStats }> {
  return withRetry(async () => {
    const sourcePath = path.join(corpusPath, file.file);
    const raw = await readFile(sourcePath, "utf8");
    const parsed = matter(raw);
    const metadata = buildMetadata(file, parsed.data);
    const chunks = chunkBody(parsed.content.trim());
    const allPatterns: EvalPattern[] = [];
    const stats: ExtractionStats = { inputTokens: 0, outputTokens: 0 };

    for (const [chunkIndex, chunk] of chunks.entries()) {
      const result = await extractChunk(
        client,
        buildUserMessage(metadata, chunk, chunkIndex, chunks.length),
      );

      allPatterns.push(...result.patterns);
      stats.inputTokens += result.stats.inputTokens;
      stats.outputTokens += result.stats.outputTokens;
    }

    await writeFile(
      path.join(outputDir, `${fileId(file.file)}.json`),
      `${JSON.stringify(allPatterns, null, 2)}\n`,
    );

    return { patterns: allPatterns.length, stats };
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

  const corpusPath = getRequiredEnv("LENNY_CORPUS_PATH");
  const outputDir = path.join(process.cwd(), "data", "extracted");
  const filesPath = path.join(process.cwd(), "data", "files-to-process.json");
  const filesToProcess = JSON.parse(
    await readFile(filesPath, "utf8"),
  ) as FilesToProcess;
  const files = [...filesToProcess.tier1, ...filesToProcess.tier2];
  const client = new OpenAI({
    apiKey: getRequiredEnv("DEEPSEEK_API_KEY"),
    baseURL: "https://api.deepseek.com/v1",
  });

  await mkdir(outputDir, { recursive: true });

  let totalPatterns = 0;
  let succeeded = 0;
  let failed = 0;
  const totalStats: ExtractionStats = { inputTokens: 0, outputTokens: 0 };

  await runBatch(files, concurrency, async (file, index) => {
    const startedAt = Date.now();

    try {
      const result = await processFile(client, corpusPath, outputDir, file);
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      totalPatterns += result.patterns;
      totalStats.inputTokens += result.stats.inputTokens;
      totalStats.outputTokens += result.stats.outputTokens;
      succeeded += 1;

      console.log(
        `[${index + 1}/${files.length}] ✓ ${file.file} → ${
          result.patterns
        } patterns extracted (${elapsedSeconds}s)`,
      );
    } catch (error: unknown) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[${index + 1}/${files.length}] ✗ ${file.file} → ${message}`);
    }
  });

  const estimatedCost =
    (totalStats.inputTokens / 1_000_000) * 0.27 +
    (totalStats.outputTokens / 1_000_000) * 1.1;

  console.log(
    `Summary: ${files.length} files, ${succeeded} succeeded, ${failed} failed, ${totalPatterns} patterns, ${totalStats.inputTokens} input tokens, ${totalStats.outputTokens} output tokens, estimated cost $${estimatedCost.toFixed(
      4,
    )}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
