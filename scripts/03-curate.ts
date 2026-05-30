import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import OpenAI from "openai";
import { z } from "zod";

type CorpusEntry = {
  title: string;
  filename: string;
  date?: string;
  guest?: string;
};

type CorpusIndex = {
  podcasts?: CorpusEntry[];
  newsletters?: CorpusEntry[];
};

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

const sourceSchema = z.object({
  file: z.string(),
  title: z.string(),
  date: z.string(),
  operator: z.string(),
  url: z.string().optional(),
  excerpt: z.string(),
});

const rawPatternSchema = z.object({
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

const evalPatternSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
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
  source_operator: z.string(),
  source_file: z.string(),
  source_title: z.string(),
  source_date: z.string(),
  source_url: z.string().optional(),
  source_excerpt: z.string(),
  codex_prompt_template: z.string(),
  keywords: z.array(z.string()),
  curation_status: z.enum(["auto", "verified", "edited"]),
  sources: z.array(sourceSchema).optional(),
});

type RawPattern = z.infer<typeof rawPatternSchema>;
type Source = z.infer<typeof sourceSchema>;
type EvalPattern = z.infer<typeof evalPatternSchema>;
type AnnotatedPattern = RawPattern & {
  rawId: string;
  source: Source;
};

const clusterSchema = z.object({
  canonical_name: z.string(),
  pattern_ids: z.array(z.string()).min(1),
  rationale: z.string(),
});

const clusterResponseSchema = z.object({
  clusters: z.array(clusterSchema),
});

type Cluster = z.infer<typeof clusterSchema>;

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function slugify(name: string): string {
  return (
    normalizeName(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "pattern"
  );
}

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

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function uniqueValues<T extends string>(values: T[]): T[] {
  return [...new Set(values)];
}

function mergeBullets(
  group: AnnotatedPattern[],
  key: "when_to_use" | "when_not_to_use" | "common_pitfalls",
  preferredPattern: AnnotatedPattern,
): string[] {
  const orderedPatterns = [
    preferredPattern,
    ...group.filter((pattern) => pattern !== preferredPattern),
  ];

  return uniqueStrings(orderedPatterns.flatMap((pattern) => pattern[key])).slice(
    0,
    8,
  );
}

function excerptWordCount(excerpt: string): number {
  return excerpt.trim().split(/\s+/).filter(Boolean).length;
}

function choosePrimaryExcerpt(patterns: AnnotatedPattern[]): AnnotatedPattern {
  const eligible = patterns.filter(
    (pattern) => excerptWordCount(pattern.source_excerpt) <= 300,
  );
  const candidates = eligible.length > 0 ? eligible : patterns;

  return [...candidates].sort(
    (a, b) => b.source_excerpt.length - a.source_excerpt.length,
  )[0];
}

function getSourceFileFromExtractionName(filename: string): string {
  return `${filename.replace(/\.json$/, "").replaceAll("__", "/")}.md`;
}

function flattenIndex(index: CorpusIndex): Map<string, CorpusEntry> {
  return new Map(
    [...(index.newsletters ?? []), ...(index.podcasts ?? [])].map((entry) => [
      entry.filename,
      entry,
    ]),
  );
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

async function loadSource(
  corpusPath: string,
  file: string,
  entriesByFilename: Map<string, CorpusEntry>,
): Promise<Source> {
  const entry = entriesByFilename.get(file);

  if (!entry) {
    throw new Error(`Source file is missing from index.json: ${file}`);
  }

  const markdown = await readFile(path.join(corpusPath, file), "utf8");
  const { data } = matter(markdown);
  const isPodcast = file.startsWith("podcasts/");
  const operator = isPodcast ? entry.guest ?? "" : "Lenny Rachitsky";
  const url =
    asString(data.url) ?? asString(data.post_url) ?? asString(data.youtube_url);

  return {
    file,
    title: entry.title,
    date: entry.date ?? "",
    operator,
    ...(url ? { url } : {}),
    excerpt: "",
  };
}

function mergeGroup(
  group: AnnotatedPattern[],
  canonicalName: string,
): Omit<EvalPattern, "id"> {
  const longestExplanation = [...group].sort(
    (a, b) => b.explanation.length - a.explanation.length,
  )[0];
  const primaryExcerpt = choosePrimaryExcerpt(group);
  const sources = group.map(({ source, source_excerpt }) => ({
    ...source,
    excerpt: source_excerpt,
  }));

  return {
    ...longestExplanation,
    name: canonicalName,
    feature_types: uniqueValues(
      group.flatMap((pattern) => pattern.feature_types),
    ),
    when_to_use: mergeBullets(group, "when_to_use", longestExplanation),
    when_not_to_use: mergeBullets(group, "when_not_to_use", longestExplanation),
    common_pitfalls: mergeBullets(group, "common_pitfalls", longestExplanation),
    keywords: uniqueStrings(group.flatMap((pattern) => pattern.keywords)),
    source_operator: longestExplanation.source.operator,
    source_file: longestExplanation.source.file,
    source_title: longestExplanation.source.title,
    source_date: longestExplanation.source.date,
    ...(longestExplanation.source.url
      ? { source_url: longestExplanation.source.url }
      : {}),
    source_excerpt: primaryExcerpt.source_excerpt,
    curation_status: "auto",
    ...(group.length > 1 ? { sources } : {}),
  };
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function renderDistribution(title: string, counts: Map<string, number>): string[] {
  const lines = [`## ${title}`, "", "| Value | Count |", "| --- | ---: |"];

  for (const [value, count] of [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(`| ${value} | ${count} |`);
  }

  lines.push("");
  return lines;
}

function buildReport(
  rawCount: number,
  clusters: Cluster[],
  patterns: EvalPattern[],
): string {
  const operatorCounts = countBy(
    patterns.flatMap((pattern) =>
      pattern.sources?.map((source) => source.operator) ?? [pattern.source_operator],
    ),
  );
  const categoryCounts = countBy(patterns.map((pattern) => pattern.category));
  const featureTypeCounts = countBy(
    patterns.flatMap((pattern) => pattern.feature_types),
  );
  const topOperators = [...operatorCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);
  const topClusters = [...clusters]
    .sort(
      (a, b) =>
        b.pattern_ids.length - a.pattern_ids.length ||
        a.canonical_name.localeCompare(b.canonical_name),
    )
    .slice(0, 10);

  return [
    "# Curation report",
    "",
    `- Raw extracted patterns: ${rawCount}`,
    `- Total clusters formed: ${clusters.length}`,
    `- Final curated patterns: ${patterns.length}`,
    `- Deduplicated away: ${rawCount - patterns.length}`,
    "",
    "## Top 10 largest clusters",
    "",
    "| Canonical name | Members |",
    "| --- | ---: |",
    ...topClusters.map(
      (cluster) =>
        `| ${cluster.canonical_name} | ${cluster.pattern_ids.length} |`,
    ),
    "",
    "## Top 10 most-cited operators",
    "",
    "| Operator | Citations |",
    "| --- | ---: |",
    ...topOperators.map(([operator, count]) => `| ${operator} | ${count} |`),
    "",
    ...renderDistribution("Distribution by category", categoryCounts),
    ...renderDistribution("Distribution by feature type", featureTypeCounts),
  ].join("\n");
}

function buildClusterPrompt(patterns: AnnotatedPattern[]): string {
  const patternSummaries = patterns.map(
    ({ rawId, name, one_liner, definition }) => ({
      id: rawId,
      name,
      one_liner,
      definition,
    }),
  );

  return `Below are AI eval patterns extracted from multiple interviews. Some are the SAME technique named differently and should be merged. Many others are RELATED but DISTINCT techniques that must stay separate. This is a browseable library of patterns, so preserve every genuinely distinct, separately-buildable pattern as its own entry.

Output JSON: { "clusters": [{ "canonical_name": "<best name>", "pattern_ids": ["<id1>", "<id2>"], "rationale": "<one sentence>" }] }

Rules:
- Every pattern must be in exactly one cluster.
- Merge two patterns ONLY when they describe the same actionable technique under a different name or wording (a true duplicate, e.g. 'Error Analysis (open coding)' and 'Open + Axial Coding'). When in doubt, keep them separate.
- Keep distinct techniques in separate clusters even when they belong to the same broader workflow, lifecycle, or toolchain. For example, "LLM-as-a-Judge", "Calibrating a judge with TPR/TNR", "Error analysis / open coding", "Golden-dataset CI regression testing", "Production monitoring with implicit signals", and "Vibe checks before evals" are RELATED but DISTINCT — each is its own cluster.
- A pattern that names a separately-buildable method, metric, or step gets its own cluster, even if another pattern references it as part of a larger process.
- Do NOT merge across different techniques just because they share a theme, lifecycle, or implementation detail.
- Singletons (patterns with no true duplicate) get their own cluster of size 1.
- Pick the most precise canonical_name from the cluster members; don't invent new names.

Patterns:
${JSON.stringify(patternSummaries)}`;
}

async function clusterPatterns(
  client: OpenAI,
  patterns: AnnotatedPattern[],
): Promise<Cluster[]> {
  let prompt = buildClusterPrompt(patterns);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const response = await client.chat.completions.create({
      model:
        process.env.DEEPSEEK_MODEL_PIPELINE ?? process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      // deepseek-v4 models are reasoning models that spend tokens thinking
      // before emitting the answer. A small cap gets consumed entirely by
      // reasoning, leaving empty content — so give the call ample headroom.
      max_tokens: 32_000,
    });
    const content = response.choices[0]?.message.content;

    if (!content) {
      const finish = response.choices[0]?.finish_reason;
      throw new Error(
        `DeepSeek returned an empty clustering response (finish_reason=${finish}, usage=${JSON.stringify(response.usage)}).`,
      );
    }

    try {
      const clusters = normalizeClusters(
        ensureMemberCanonicalNames(
          clusterResponseSchema.parse(JSON.parse(content)).clusters,
          patterns,
        ),
        patterns,
      );
      validateClusters(clusters, patterns);
      return clusters;
    } catch (error: unknown) {
      if (attempt === 2) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      prompt = `${buildClusterPrompt(patterns)}

Your previous response was invalid: ${message}
Return a corrected JSON object where every pattern id appears exactly once and only once.`;
    }
  }

  throw new Error("Failed to cluster patterns.");
}

async function clusterPatternBatch(
  client: OpenAI,
  patterns: AnnotatedPattern[],
): Promise<Cluster[]> {
  const batchPatterns = patterns.map((pattern, index) => ({
    ...pattern,
    rawId: `pattern-${String(index + 1).padStart(3, "0")}`,
  }));
  const originalIdsByBatchId = new Map(
    batchPatterns.map((pattern, index) => [pattern.rawId, patterns[index].rawId]),
  );
  const clusters = await clusterPatterns(client, batchPatterns);

  return clusters.map((cluster) => ({
    ...cluster,
    pattern_ids: cluster.pattern_ids.map((id) => {
      const originalId = originalIdsByBatchId.get(id);

      if (!originalId) {
        throw new Error(`Cluster references unknown batch pattern id: ${id}`);
      }

      return originalId;
    }),
  }));
}

function validateClusters(
  clusters: Cluster[],
  patterns: AnnotatedPattern[],
): void {
  const patternsById = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));
  const seen = new Set<string>();

  for (const cluster of clusters) {
    const names = cluster.pattern_ids.map((id) => {
      const pattern = patternsById.get(id);

      if (!pattern) {
        throw new Error(`Cluster references unknown pattern id: ${id}`);
      }

      if (seen.has(id)) {
        throw new Error(`Pattern appears in multiple clusters: ${id}`);
      }

      seen.add(id);
      return pattern.name;
    });

    if (!names.includes(cluster.canonical_name)) {
      throw new Error(
        `Cluster canonical name is not one of its members: ${cluster.canonical_name}`,
      );
    }
  }

  if (seen.size !== patterns.length) {
    const missing = patterns
      .filter((pattern) => !seen.has(pattern.rawId))
      .map((pattern) => pattern.rawId);
    throw new Error(`Some patterns were not clustered: ${missing.join(", ")}`);
  }
}

function ensureMemberCanonicalNames(
  clusters: Cluster[],
  patterns: AnnotatedPattern[],
): Cluster[] {
  const patternsById = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));

  return clusters.map((cluster) => {
    const members = cluster.pattern_ids
      .map((id) => patternsById.get(id))
      .filter((pattern): pattern is AnnotatedPattern => pattern !== undefined);

    if (members.some((pattern) => pattern.name === cluster.canonical_name)) {
      return cluster;
    }

    const fallback = [...members].sort(
      (a, b) => b.explanation.length - a.explanation.length,
    )[0];

    return fallback ? { ...cluster, canonical_name: fallback.name } : cluster;
  });
}

function normalizeClusters(
  clusters: Cluster[],
  patterns: AnnotatedPattern[],
): Cluster[] {
  const patternsById = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));
  const seen = new Set<string>();
  const normalized: Cluster[] = [];

  for (const cluster of clusters) {
    const patternIds = cluster.pattern_ids.filter((id) => {
      if (!patternsById.has(id) || seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    });

    if (patternIds.length === 0) {
      continue;
    }

    const members = patternIds
      .map((id) => patternsById.get(id))
      .filter((pattern): pattern is AnnotatedPattern => pattern !== undefined);
    const canonicalName = members.some(
      (pattern) => pattern.name === cluster.canonical_name,
    )
      ? cluster.canonical_name
      : [...members].sort(
          (a, b) => b.explanation.length - a.explanation.length,
        )[0].name;

    normalized.push({
      ...cluster,
      canonical_name: canonicalName,
      pattern_ids: patternIds,
    });
  }

  for (const pattern of patterns) {
    if (!seen.has(pattern.rawId)) {
      normalized.push({
        canonical_name: pattern.name,
        pattern_ids: [pattern.rawId],
        rationale: "Singleton pattern with no semantic duplicate assigned.",
      });
    }
  }

  return normalized;
}

function applyManualClusterOverrides(
  clusters: Cluster[],
  patterns: AnnotatedPattern[],
): Cluster[] {
  const patternsById = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));
  const splitNames = new Set([
    "Top-Down SEO Forecasting (TAM-Based)",
    "A/B Experimentation with Control Group for AEO",
  ]);
  const overridden: Cluster[] = [];

  for (const cluster of clusters) {
    const memberIdsByName = new Map<string, string[]>();

    for (const id of cluster.pattern_ids) {
      const pattern = patternsById.get(id);

      if (!pattern) {
        continue;
      }

      memberIdsByName.set(pattern.name, [
        ...(memberIdsByName.get(pattern.name) ?? []),
        id,
      ]);
    }

    const idsToSplit = [...splitNames]
      .flatMap((name) => memberIdsByName.get(name) ?? []);

    if (idsToSplit.length === 0) {
      overridden.push(cluster);
      continue;
    }

    const remainingIds = cluster.pattern_ids.filter(
      (id) => !idsToSplit.includes(id),
    );

    if (remainingIds.length > 0) {
      overridden.push({
        ...cluster,
        pattern_ids: remainingIds,
      });
    }

    for (const name of splitNames) {
      const patternIds = memberIdsByName.get(name) ?? [];

      if (patternIds.length > 0) {
        overridden.push({
          canonical_name: name,
          pattern_ids: patternIds,
          rationale: "Manual split for AEO-adjacent concepts.",
        });
      }
    }
  }

  return overridden;
}

async function main(): Promise<void> {
  await loadLocalEnv();

  const projectRoot = process.cwd();
  const corpusPath = process.env.LENNY_CORPUS_PATH;

  if (!corpusPath) {
    throw new Error("LENNY_CORPUS_PATH env var is required.");
  }

  const extractedDir = path.join(projectRoot, "data", "extracted");
  const index = JSON.parse(
    await readFile(path.join(corpusPath, "index.json"), "utf8"),
  ) as CorpusIndex;
  const entriesByFilename = flattenIndex(index);
  const extractionFiles = (await readdir(extractedDir))
    .filter((file) => file.endsWith(".json"))
    .sort();
  const patterns: AnnotatedPattern[] = [];

  for (const extractionFile of extractionFiles) {
    const sourceFile = getSourceFileFromExtractionName(extractionFile);
    const source = await loadSource(corpusPath, sourceFile, entriesByFilename);
    const raw = JSON.parse(
      await readFile(path.join(extractedDir, extractionFile), "utf8"),
    ) as unknown;

    for (const pattern of z.array(rawPatternSchema).parse(raw)) {
      patterns.push({
        ...pattern,
        rawId: `raw-${String(patterns.length + 1).padStart(3, "0")}`,
        source: { ...source, excerpt: pattern.source_excerpt },
      });
    }
  }

  const client = new OpenAI({
    apiKey: getRequiredEnv("DEEPSEEK_API_KEY"),
    baseURL: "https://api.deepseek.com/v1",
  });
  const clusters = applyManualClusterOverrides(
    await clusterPatternBatch(client, patterns),
    patterns,
  );
  validateClusters(clusters, patterns);
  const patternsById = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));

  const usedIds = new Map<string, number>();
  const curated = clusters.map((cluster) => {
    const group = cluster.pattern_ids.map((id) => {
      const pattern = patternsById.get(id);

      if (!pattern) {
        throw new Error(`Cluster references unknown pattern id: ${id}`);
      }

      return pattern;
    });
    const merged = mergeGroup(group, cluster.canonical_name);
    const baseId = slugify(merged.name);
    const count = (usedIds.get(baseId) ?? 0) + 1;
    usedIds.set(baseId, count);

    return {
      id: count === 1 ? baseId : `${baseId}-${count}`,
      ...merged,
    };
  });

  const validated = z.array(evalPatternSchema).parse(curated);
  validated.sort((a, b) => a.id.localeCompare(b.id));

  if (validated.length < 25) {
    throw new Error(
      `Expected at least 25 distinct patterns, found ${validated.length}.`,
    );
  }

  await mkdir(path.join(projectRoot, "data"), { recursive: true });
  await writeFile(
    path.join(projectRoot, "data", "evals.json"),
    `${JSON.stringify(validated, null, 2)}\n`,
  );
  await writeFile(
    path.join(projectRoot, "data", "curation-report.md"),
    `${buildReport(patterns.length, clusters, validated)}\n`,
  );

  console.log(
    `Curated ${patterns.length} raw patterns into ${validated.length} final patterns.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
