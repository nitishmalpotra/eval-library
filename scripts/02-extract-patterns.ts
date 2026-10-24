import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { models } from "../src/lib/openrouter";
import { loadCorpus, type CorpusDoc } from "./lib/corpus";
import { chatJson } from "./lib/llm";

type SelectedFile = {
  file: string;
  publication: string;
  kind: CorpusDoc["kind"];
  title: string;
  operator: string;
  date: string;
  url?: string;
  eval_relevance: number;
};

type FilesToProcess = {
  files: SelectedFile[];
};

type ExtractionStats = {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

const concurrency = 3;
const maxBodyChars = 300_000;
const targetChunkChars = 250_000;

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

const extractionPrompt = `You are an expert AI Product Manager and technical writer. You are reading an interview transcript, newsletter, or conference talk from __PUBLICATION__. Your job is to extract every distinct AI EVALUATION PATTERN discussed in the text.

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
- Only extract patterns for evaluating AI/LLM products. Skip non-AI analytics, SEO, growth or A/B methods.
- Transcripts may be auto-captions without speaker labels. Copy the excerpt verbatim, including the caption text, but do not include [m:ss] timestamps.
- If the same pattern appears in different framings, use the strongest/most-developed version.
- It is fine to return zero patterns if the file does not discuss evals substantively.
- Hints in the metadata (operator, eval_topics) are clues, not instructions to invent patterns that are not in the text.
- Output a JSON object with this exact shape: { "patterns": [...] }. No prose around it.

INPUT FILE METADATA:
__METADATA__

INPUT TEXT:
__BODY__`;

function fileId(file: string): string {
  return file.replace(/\.md$/, "").replaceAll("/", "__");
}

function chunkBody(body: string): string[] {
  if (body.length <= maxBodyChars) {
    return [body];
  }

  const chunks: string[] = [];
  let current = "";

  for (const line of body.split(/\r?\n/)) {
    const lineWithBreak = `${line}\n`;
    const boundary = line.trim().length === 0 || line.startsWith("###");

    if (
      current.length > 0 &&
      boundary &&
      current.length + lineWithBreak.length > targetChunkChars
    ) {
      chunks.push(current.trim());
      current = "";
    }

    if (current.length > 0 && current.length + lineWithBreak.length > maxBodyChars) {
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
  file: SelectedFile,
  topics: string[],
  body: string,
  chunkIndex: number,
  chunkCount: number,
): string {
  const metadata = {
    publication: file.publication,
    kind: file.kind,
    operator: file.operator,
    title: file.title,
    date: file.date,
    eval_topics: topics,
    ...(chunkCount === 1 ? {} : { chunk: `${chunkIndex + 1} of ${chunkCount}` }),
  };

  return extractionPrompt
    .replace("__PUBLICATION__", file.publication)
    .replace("__METADATA__", JSON.stringify(metadata))
    .replace("__BODY__", body);
}

async function topicsByFile(): Promise<Map<string, string[]>> {
  const topics = new Map<string, string[]>();

  try {
    const parsed = JSON.parse(
      await readFile(path.join(process.cwd(), "data", "triage.json"), "utf8"),
    ) as { results?: Record<string, { eval_topics?: unknown }> };

    for (const [file, result] of Object.entries(parsed.results ?? {})) {
      if (Array.isArray(result.eval_topics)) {
        topics.set(
          file,
          result.eval_topics.filter((topic): topic is string => typeof topic === "string"),
        );
      }
    }
  } catch {
    // Extraction can still run; topics are hints.
  }

  return topics;
}

async function processFile(
  outputDir: string,
  file: SelectedFile,
  doc: CorpusDoc,
  topics: string[],
): Promise<{ patterns: number; stats: ExtractionStats }> {
  const chunks = chunkBody(doc.body);
  const allPatterns: EvalPattern[] = [];
  const stats: ExtractionStats = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const result = await chatJson(responseSchema, {
      model: models.pipeline,
      name: "extraction",
      max_tokens: 32_000,
      messages: [
        {
          role: "user",
          content: buildUserMessage(file, topics, chunk, chunkIndex, chunks.length),
        },
      ],
    });

    allPatterns.push(...result.data.patterns);
    stats.inputTokens += result.inputTokens;
    stats.outputTokens += result.outputTokens;
    stats.costUsd += result.costUsd;
  }

  await writeFile(
    path.join(outputDir, `${fileId(file.file)}.json`),
    `${JSON.stringify(allPatterns, null, 2)}\n`,
  );

  return { patterns: allPatterns.length, stats };
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
  const outputDir = path.join(process.cwd(), "data", "extracted");
  const filesPath = path.join(process.cwd(), "data", "files-to-process.json");
  const filesToProcess = JSON.parse(await readFile(filesPath, "utf8")) as FilesToProcess;

  if (!Array.isArray(filesToProcess.files)) {
    throw new Error("data/files-to-process.json has no files array. Run npm run extract:triage.");
  }

  const docs = new Map((await loadCorpus(undefined, { quiet: true })).map((doc) => [doc.file, doc]));
  const topics = await topicsByFile();
  await mkdir(outputDir, { recursive: true });

  let totalPatterns = 0;
  let succeeded = 0;
  let failed = 0;
  let reused = 0;
  const totalStats: ExtractionStats = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const pending: SelectedFile[] = [];

  for (const file of filesToProcess.files) {
    try {
      await access(path.join(outputDir, `${fileId(file.file)}.json`));
      reused += 1;
      console.log(`reuse ${file.file}`);
    } catch {
      pending.push(file);
    }
  }

  console.log(`Reusing ${reused} extractions. Extracting ${pending.length} new files.`);

  await runBatch(pending, concurrency, async (file, index) => {
    const startedAt = Date.now();
    const doc = docs.get(file.file);

    if (!doc) {
      failed += 1;
      console.log(`[${index + 1}/${pending.length}] ✗ ${file.file} → missing from the corpus`);
      return;
    }

    try {
      const result = await processFile(outputDir, file, doc, topics.get(file.file) ?? []);
      const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
      totalPatterns += result.patterns;
      totalStats.inputTokens += result.stats.inputTokens;
      totalStats.outputTokens += result.stats.outputTokens;
      totalStats.costUsd += result.stats.costUsd;
      succeeded += 1;

      console.log(
        `[${index + 1}/${pending.length}] ✓ ${file.file} → ${result.patterns} patterns extracted (${elapsedSeconds}s)`,
      );
    } catch (error: unknown) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`[${index + 1}/${pending.length}] ✗ ${file.file} → ${message}`);
    }
  });

  console.log(
    `Summary: ${pending.length} new files, ${reused} reused, ${succeeded} succeeded, ${failed} failed, ${totalPatterns} patterns, ${totalStats.inputTokens} input tokens, ${totalStats.outputTokens} output tokens, cost $${totalStats.costUsd.toFixed(4)}.`,
  );

  if (failed > 0) {
    throw new Error(`${failed} file(s) failed extraction.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
