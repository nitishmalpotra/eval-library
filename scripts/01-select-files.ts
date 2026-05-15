import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type CorpusEntry = {
  title: string;
  filename: string;
  tags?: string[];
  word_count?: number;
  date?: string;
  description?: string;
  guest?: string;
};

type CorpusIndex = {
  podcasts?: CorpusEntry[];
  newsletters?: CorpusEntry[];
};

type Tier1Output = {
  file: string;
  title: string;
  date: string;
  guest: string;
  word_count: number;
};

type Tier2Output = Tier1Output & {
  eval_mention_count: number;
};

const tier1Files = [
  "newsletters/building-eval-systems-that-improve-your-ai-product.md",
  "newsletters/beyond-vibe-checks-a-pms-complete-guide-to-evals.md",
  "podcasts/hamel-husain--shreya-shankar.md",
  "podcasts/brendan-foody.md",
  "newsletters/counterintuitive-advice-for-building-ai-products.md",
  "newsletters/an-ai-glossary.md",
  "newsletters/how-close-is-ai-to-replacing-product-managers.md",
] as const;

function getCorpusPath(): string {
  const corpusPath = process.env.LENNY_CORPUS_PATH;

  if (!corpusPath) {
    throw new Error("LENNY_CORPUS_PATH env var is required.");
  }

  return corpusPath;
}

function flattenIndex(index: CorpusIndex): CorpusEntry[] {
  return [...(index.newsletters ?? []), ...(index.podcasts ?? [])];
}

function toOutput(entry: CorpusEntry): Tier1Output {
  return {
    file: entry.filename,
    title: entry.title,
    date: entry.date ?? "",
    guest: entry.guest ?? "",
    word_count: entry.word_count ?? 0,
  };
}

function isTier2Candidate(entry: CorpusEntry): boolean {
  const tags = entry.tags ?? [];
  const titleAndDescription = `${entry.title} ${entry.description ?? ""}`;

  return (
    tags.includes("ai") ||
    titleAndDescription.toLocaleLowerCase().includes("eval")
  );
}

function countEvalMentions(body: string): number {
  return body.match(/eval/gi)?.length ?? 0;
}

async function main(): Promise<void> {
  const corpusPath = getCorpusPath();
  const indexPath = path.join(corpusPath, "index.json");
  const index = JSON.parse(await readFile(indexPath, "utf8")) as CorpusIndex;
  const entries = flattenIndex(index);
  const entriesByFilename = new Map(entries.map((entry) => [entry.filename, entry]));

  const tier1 = tier1Files.map((filename) => {
    const entry = entriesByFilename.get(filename);

    if (!entry) {
      throw new Error(`Tier 1 file is missing from index.json: ${filename}`);
    }

    return toOutput(entry);
  });

  const tier1Set = new Set<string>(tier1Files);
  const tier2Candidates = entries
    .filter((entry) => !tier1Set.has(entry.filename))
    .filter(isTier2Candidate);

  const tier2WithMentionCounts: Tier2Output[] = [];

  for (const entry of tier2Candidates) {
    const body = await readFile(path.join(corpusPath, entry.filename), "utf8");
    const evalMentionCount = countEvalMentions(body);

    if (evalMentionCount >= 3) {
      tier2WithMentionCounts.push({
        ...toOutput(entry),
        eval_mention_count: evalMentionCount,
      });
    }
  }

  const tier2 = tier2WithMentionCounts
    .sort((a, b) => b.word_count - a.word_count)
    .slice(0, 25);

  const output = {
    generated_at: new Date().toISOString(),
    tier1,
    tier2,
  };

  const outputPath = path.join(process.cwd(), "data", "files-to-process.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  const estimatedTotalWords = [...tier1, ...tier2].reduce(
    (total, file) => total + file.word_count,
    0,
  );

  console.log(
    `Tier 1: ${tier1.length} files. Tier 2: ${tier2.length} files. Total to process: ${
      tier1.length + tier2.length
    }. Estimated total words: ${estimatedTotalWords}.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
