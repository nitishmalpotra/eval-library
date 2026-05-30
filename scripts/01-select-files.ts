import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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
  eval_score: number;
};

// Cap on Tier 2 files to keep extraction time/cost bounded. With the
// eval-signal gate below, the qualifying pool is small (~17), so this rarely
// binds — but it guarantees a hard upper bound.
const MAX_TIER2 = 25;

const tier1Files = [
  "newsletters/building-eval-systems-that-improve-your-ai-product.md",
  "newsletters/beyond-vibe-checks-a-pms-complete-guide-to-evals.md",
  // Introduces the Continuous Calibration/Continuous Development (CC/CD)
  // eval framework — as eval-central as the other Tier 1 files.
  "newsletters/why-your-ai-product-needs-a-different-development-lifecycle.md",
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

// Eval-signal scoring. A bare substring "eval" is too noisy to rank on: it
// also matches "retrieval", "evaluate", and generic "evaluation" in non-AI
// business contexts (e.g. "evaluating a marketplace idea"). We instead score
// on the AI-eval term of art.
const EVAL_NOUN = /\bevals?\b/gi; // standalone "eval" / "evals"
const LLM_JUDGE = /llm[\s-]as[\s-]a[\s-]judge/gi; // canonical methodology
const EVAL_CONCEPT =
  /\beval[\s-](?:sets?|suites?|frameworks?|driven|harness|pipelines?|systems?|scores?|metrics?)\b/gi;

type EvalSignal = {
  /** Standalone "eval"/"evals" mentions — the term of art. */
  nouns: number;
  /** Explicit "LLM-as-a-judge" references. */
  judges: number;
  /** Compound eval terms: "eval set", "eval framework", etc. */
  concepts: number;
  /** Weighted relevance score used to rank Tier 2. */
  score: number;
};

function scoreEvalSignal(body: string): EvalSignal {
  const nouns = body.match(EVAL_NOUN)?.length ?? 0;
  const judges = body.match(LLM_JUDGE)?.length ?? 0;
  const concepts = body.match(EVAL_CONCEPT)?.length ?? 0;

  return { nouns, judges, concepts, score: nouns + judges * 4 + concepts * 2 };
}

async function main(): Promise<void> {
  await loadLocalEnv();
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

  const tier2Scored: Tier2Output[] = [];

  for (const entry of tier2Candidates) {
    const body = await readFile(path.join(corpusPath, entry.filename), "utf8");
    const signal = scoreEvalSignal(body);

    // Require genuine eval signal: at least two "eval(s)" mentions, or any
    // explicit "LLM-as-a-judge" reference. This filters files that only trip
    // the candidate gate via the noisy "eval" substring.
    if (signal.nouns >= 2 || signal.judges >= 1) {
      tier2Scored.push({
        ...toOutput(entry),
        eval_mention_count: signal.nouns,
        eval_score: signal.score,
      });
    }
  }

  // Rank by eval relevance, not word count — so a short, eval-dense newsletter
  // is never crowded out by a long podcast that merely name-drops "evaluate".
  // Word count breaks ties.
  const tier2 = tier2Scored
    .sort((a, b) => b.eval_score - a.eval_score || b.word_count - a.word_count)
    .slice(0, MAX_TIER2);

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
