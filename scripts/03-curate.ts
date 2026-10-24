import { execFile } from "node:child_process";
import { access, copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { getOpenRouter, models, pipelineTimeoutMs, usageCostUsd } from "../src/lib/openrouter";
import { loadCorpus } from "./lib/corpus";
import { excerptMatches } from "./lib/excerpts";
import { assertBudget, chatJson, recordSpend, spentUsd } from "./lib/llm";
import { normalizeOperators, type OperatorMerge } from "./lib/operators";

const execFileAsync = promisify(execFile);
const synthesisConcurrency = 2;

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
  publication: z.string(),
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
  source_publication: z.string(),
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
  drop: z.boolean(),
  drop_reason: z.string(),
});

const clusterResponseSchema = z.object({
  clusters: z.array(clusterSchema),
});

type Cluster = z.infer<typeof clusterSchema>;

const synthesisSchema = z.object({
  name: z.string(),
  one_liner: z.string(),
  category: z.enum(["methodology", "metric", "process", "framework"]),
  feature_types: z.array(featureTypeSchema).min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  definition: z.string(),
  explanation: z.string(),
  when_to_use: z.array(z.string()),
  when_not_to_use: z.array(z.string()),
  common_pitfalls: z.array(z.string()),
  metric_or_method: z.string(),
  keywords: z.array(z.string()),
  codex_prompt_template: z.string(),
});

type Synthesis = z.infer<typeof synthesisSchema>;

type BuiltPattern = {
  cluster: Cluster;
  members: AnnotatedPattern[];
  pattern: EvalPattern;
};

type CoverageGap = {
  kind: "publication" | "category" | "feature_type";
  value: string;
  explanation: string;
};

type RedirectRow = {
  oldId: string;
  oldName: string;
  newId: string;
  newName: string;
  score: number;
  redirect: boolean;
  manual: boolean;
};

type ExcerptRow = {
  name: string;
  primary: "pass" | "repaired";
  dropped: string[];
};

const JUDGE_NAME = "LLM-as-a-Judge";

const REDIRECT_OVERRIDES: Record<string, string> = {
  "diy-data-inspection-dashboards": "custom-trace-review-and-annotation-tooling",
  "dual-purpose-evaluations": "rubrics-and-verifiers-as-rl-reward-signals",
  "llm-arena-voting": "custom-private-benchmarks-on-your-own-use-case",
  "llm-introspection-debugging": "root-cause-postmortem-of-ai-failures",
  "role-specific-skill-taxonomy-for-ai-benchmarking": "custom-private-benchmarks-on-your-own-use-case",
  "small-batch-eval-building": "eval-type-selection-and-prioritization",
  "overall-correctness-eval": "llm-as-a-judge",
  "spreadsheet-based-ideal-behavior-specification": "evals-as-product-requirements",
};

const BAR_DROPS = [
  "ai-tool-productivity-impact-measurement",
  "ai-safety-levels-asl-risk-tiering",
  "social-media-sentiment-monitoring-reddit-twitter-vibes",
  "latency-threshold-experiments-for-inline-suggestions",
  "economic-turing-test",
] as const;

const BAR_MERGES: Array<{ child: string; parent: string }> = [
  { child: "price-performance-model-selection-per-step", parent: "multi-method-model-swap-evaluation" },
  { child: "hit-rate-matched-product-design", parent: "minimum-viable-quality-thresholds-with-cost-envelope" },
  { child: "red-green-tdd-for-coding-agents", parent: "execution-based-verification-of-ai-generated-code" },
  { child: "spec-based-automated-ai-review", parent: "ai-reviewer-agents-cross-model-critique" },
  { child: "uplift-trial-a-b-test-against-search", parent: "human-baseline-comparison" },
  { child: "agent-escalation-to-human-with-trace-capture", parent: "root-cause-postmortem-of-ai-failures" },
];

const RESCUED_RAW_NAME = "PM-Authored Evals Relayed to Engineering";
const RESCUED_PARENT_ID = "evals-as-product-requirements";

const PRESERVE_RULES: Array<{
  label: string;
  canonicalName: string;
  matches: (pattern: AnnotatedPattern) => boolean;
}> = [
  {
    label: "Statistical Score Correction using Judge Error Rates",
    canonicalName: "Statistical Score Correction using Judge Error Rates",
    matches: (pattern) => {
      const text = `${pattern.name} ${pattern.definition}`.toLowerCase();
      return (
        /score correction/.test(text) ||
        (/judge/.test(text) && /false positive/.test(text) && /false negative/.test(text) && /correct/.test(text))
      );
    },
  },
  {
    label: "Three-Layer Model Safety Evaluation",
    canonicalName: "Three-Layer Model Safety Evaluation",
    matches: (pattern) => {
      const text = `${pattern.name} ${pattern.definition}`.toLowerCase();
      return /three[- ]layer/.test(text) && /safety/.test(text);
    },
  },
];

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

function rankSourceFiles(
  group: AnnotatedPattern[],
  relevanceByFile: Map<string, number>,
): string[] {
  const counts = new Map<string, number>();

  for (const pattern of group) {
    counts.set(pattern.source.file, (counts.get(pattern.source.file) ?? 0) + 1);
  }

  const longest = (file: string) =>
    Math.max(
      ...group
        .filter((pattern) => pattern.source.file === file)
        .map((pattern) => pattern.source_excerpt.length),
    );

  return [...counts.keys()].sort((left, right) => {
    const byCount = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);

    if (byCount !== 0) {
      return byCount;
    }

    const byRelevance = (relevanceByFile.get(right) ?? 0) - (relevanceByFile.get(left) ?? 0);

    if (byRelevance !== 0) {
      return byRelevance;
    }

    return longest(right) - longest(left);
  });
}

function choosePrimaryMember(
  group: AnnotatedPattern[],
  candidates: AnnotatedPattern[],
  relevanceByFile: Map<string, number>,
): AnnotatedPattern | undefined {
  for (const file of rankSourceFiles(group, relevanceByFile)) {
    const inFile = candidates.filter((pattern) => pattern.source.file === file);

    if (inFile.length === 0) {
      continue;
    }

    return choosePrimaryExcerpt(inFile);
  }

  return undefined;
}

function getSourceFileFromExtractionName(filename: string): string {
  return `${filename.replace(/\.json$/, "").replaceAll("__", "/")}.md`;
}

function filled(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function sourceFields(pattern: AnnotatedPattern) {
  return {
    source_operator: pattern.source.operator,
    source_publication: pattern.source.publication,
    source_file: pattern.source.file,
    source_title: pattern.source.title,
    source_date: pattern.source.date,
    ...(pattern.source.url ? { source_url: pattern.source.url } : {}),
    source_excerpt: pattern.source_excerpt,
  };
}

function memberSources(group: AnnotatedPattern[], primary: AnnotatedPattern): Source[] {
  return [primary, ...group.filter((pattern) => pattern !== primary)].map((pattern) => ({
    ...pattern.source,
    excerpt: pattern.source_excerpt,
  }));
}

function assertVerbatimCitations(group: AnnotatedPattern[], pattern: Omit<EvalPattern, "id">): void {
  if (!group.some((member) => member.source_excerpt === pattern.source_excerpt)) {
    throw new Error(`Primary excerpt for "${pattern.name}" is not a verbatim member excerpt.`);
  }

  const sources = pattern.sources ?? [];

  if (group.length > 1 && sources.length !== group.length) {
    throw new Error(`"${pattern.name}" does not cite every member.`);
  }

  for (const member of group) {
    if (group.length === 1) {
      continue;
    }

    const cited = sources.some(
      (source) => source.file === member.source.file && source.excerpt === member.source_excerpt,
    );

    if (!cited) {
      throw new Error(`"${pattern.name}" is missing the citation for "${member.name}".`);
    }
  }
}

function singletonPattern(pattern: AnnotatedPattern): Omit<EvalPattern, "id"> {
  const merged = {
    ...pattern,
    feature_types: uniqueValues(pattern.feature_types),
    when_to_use: mergeBullets([pattern], "when_to_use", pattern),
    when_not_to_use: mergeBullets([pattern], "when_not_to_use", pattern),
    common_pitfalls: mergeBullets([pattern], "common_pitfalls", pattern),
    keywords: uniqueStrings(pattern.keywords),
    ...sourceFields(pattern),
    curation_status: "auto" as const,
  };
  assertVerbatimCitations([pattern], merged);
  return merged;
}

function synthesizedPattern(
  group: AnnotatedPattern[],
  synthesis: Synthesis,
): Omit<EvalPattern, "id"> {
  const primary = choosePrimaryExcerpt(group);
  const categories = uniqueValues(group.map((pattern) => pattern.category));
  const featureTypes = uniqueValues([
    ...synthesis.feature_types,
    ...group.flatMap((pattern) => pattern.feature_types),
  ]);
  const whenToUse = filled(synthesis.when_to_use);
  const whenNotToUse = filled(synthesis.when_not_to_use);
  const pitfalls = filled(synthesis.common_pitfalls);
  const merged = {
    name: synthesis.name.trim(),
    one_liner: synthesis.one_liner.trim() || primary.one_liner,
    category: categories.length === 1 ? categories[0] : synthesis.category,
    feature_types: featureTypes,
    difficulty: synthesis.difficulty,
    definition: synthesis.definition.trim(),
    explanation: synthesis.explanation.trim(),
    when_to_use: whenToUse.length > 0 ? whenToUse : mergeBullets(group, "when_to_use", primary),
    when_not_to_use:
      whenNotToUse.length > 0 ? whenNotToUse : mergeBullets(group, "when_not_to_use", primary),
    metric_or_method: synthesis.metric_or_method.trim() || primary.metric_or_method,
    common_pitfalls: pitfalls.length > 0 ? pitfalls : mergeBullets(group, "common_pitfalls", primary),
    ...sourceFields(primary),
    codex_prompt_template: synthesis.codex_prompt_template.trim() || primary.codex_prompt_template,
    keywords: uniqueStrings([...synthesis.keywords, ...group.flatMap((pattern) => pattern.keywords)]),
    curation_status: "auto" as const,
    sources: memberSources(group, primary),
  };

  if (!merged.name || !merged.definition || !merged.explanation) {
    throw new Error(`Synthesis for "${group.map((pattern) => pattern.name).join("; ")}" left a prose field empty.`);
  }

  assertVerbatimCitations(group, merged);
  return merged;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
}

function mdCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function peopleIn(operator: string): string[] {
  return operator
    .split(", ")
    .map((person) => person.trim())
    .filter(Boolean);
}

function publicationOf(pattern: EvalPattern): string[] {
  return uniqueStrings([
    pattern.source_publication || "(none)",
    ...(pattern.sources?.map((source) => source.publication || "(none)") ?? []),
  ]);
}

function beforeAfterLines(
  title: string,
  before: Map<string, number>,
  after: Map<string, number>,
): string[] {
  const values = new Set([...before.keys(), ...after.keys()]);
  const lines = [`## ${title}`, "", "| Value | Raw | Kept |", "| --- | ---: | ---: |"];

  for (const value of [...values].sort((left, right) => left.localeCompare(right))) {
    lines.push(`| ${mdCell(value)} | ${before.get(value) ?? 0} | ${after.get(value) ?? 0} |`);
  }

  lines.push("");
  return lines;
}

function locateRawPatterns(
  rawPatterns: AnnotatedPattern[],
  built: BuiltPattern[],
  drops: Cluster[],
): Map<string, { kind: "kept"; built: BuiltPattern } | { kind: "dropped"; cluster: Cluster }> {
  const located = new Map<
    string,
    { kind: "kept"; built: BuiltPattern } | { kind: "dropped"; cluster: Cluster }
  >();

  for (const item of built) {
    for (const id of item.cluster.pattern_ids) {
      if (located.has(id)) {
        throw new Error(`Raw pattern ${id} appears in more than one cluster.`);
      }

      located.set(id, { kind: "kept", built: item });
    }
  }

  for (const cluster of drops) {
    if (!cluster.drop_reason.trim()) {
      throw new Error(`Dropped cluster "${cluster.canonical_name}" has no drop_reason.`);
    }

    for (const id of cluster.pattern_ids) {
      if (located.has(id)) {
        throw new Error(`Raw pattern ${id} appears in more than one cluster.`);
      }

      located.set(id, { kind: "dropped", cluster });
    }
  }

  for (const pattern of rawPatterns) {
    if (!located.has(pattern.rawId)) {
      throw new Error(
        `Raw pattern ${pattern.rawId} (${pattern.name}) is missing from kept and dropped clusters.`,
      );
    }
  }

  return located;
}

function auditCoverage(
  rawPatterns: AnnotatedPattern[],
  built: BuiltPattern[],
  drops: Cluster[],
): CoverageGap[] {
  const located = locateRawPatterns(rawPatterns, built, drops);
  const gaps: CoverageGap[] = [];
  const dimensions: Array<{
    kind: CoverageGap["kind"];
    rawValues: (pattern: AnnotatedPattern) => string[];
    keptValues: (pattern: EvalPattern) => string[];
  }> = [
    {
      kind: "publication",
      rawValues: (pattern) => [pattern.source.publication || "(none)"],
      keptValues: (pattern) => publicationOf(pattern),
    },
    {
      kind: "category",
      rawValues: (pattern) => [pattern.category],
      keptValues: (pattern) => [pattern.category],
    },
    {
      kind: "feature_type",
      rawValues: (pattern) => pattern.feature_types,
      keptValues: (pattern) => pattern.feature_types,
    },
  ];

  for (const dimension of dimensions) {
    const rawValues = new Set(rawPatterns.flatMap((pattern) => dimension.rawValues(pattern)));
    const keptValues = new Set(
      built.flatMap((item) => dimension.keptValues(item.pattern)),
    );

    for (const value of [...rawValues].sort((left, right) => left.localeCompare(right))) {
      if (keptValues.has(value)) {
        continue;
      }

      const droppedNotes: string[] = [];
      const absorbedNotes: string[] = [];

      for (const pattern of rawPatterns) {
        if (!dimension.rawValues(pattern).includes(value)) {
          continue;
        }

        const place = located.get(pattern.rawId);

        if (!place) {
          throw new Error(`Raw pattern ${pattern.rawId} is unaccounted for.`);
        }

        if (place.kind === "dropped") {
          droppedNotes.push(`${pattern.name}: ${place.cluster.drop_reason}`);
          continue;
        }

        absorbedNotes.push(`${pattern.name} → ${place.built.pattern.id} (${place.built.pattern.category})`);
      }

      if (dimension.kind !== "category" && absorbedNotes.length > 0) {
        throw new Error(
          `${dimension.kind} "${value}" disappeared from a kept pattern. ${absorbedNotes.join("; ")}`,
        );
      }

      if (droppedNotes.length + absorbedNotes.length === 0) {
        throw new Error(`No explanation for missing ${dimension.kind} "${value}".`);
      }

      const sentences: string[] = [];

      if (absorbedNotes.length > 0) {
        sentences.push(
          `${absorbedNotes.length} merged into a pattern with a different category: ${absorbedNotes.join("; ")}`,
        );
      }

      if (droppedNotes.length > 0) {
        sentences.push(`${droppedNotes.length} dropped: ${droppedNotes.join("; ")}`);
      }

      gaps.push({ kind: dimension.kind, value, explanation: sentences.join(". ") });
    }
  }

  return gaps;
}

function buildReport(input: {
  rawPatterns: AnnotatedPattern[];
  built: BuiltPattern[];
  drops: Cluster[];
  merges: OperatorMerge[];
  gaps: CoverageGap[];
  excerptLines: string[];
  preserveNotes: string[];
  redirectRows: RedirectRow[];
}): string {
  const kept = input.built.map((item) => item.pattern);
  const droppedRaw = input.drops.reduce((sum, cluster) => sum + cluster.pattern_ids.length, 0);
  const operatorCounts = countBy(
    kept.flatMap((pattern) => {
      const operators = pattern.sources?.map((source) => source.operator) ?? [pattern.source_operator];
      return operators.flatMap((operator) => peopleIn(operator));
    }),
  );
  const topOperators = [...operatorCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10);
  const merged = input.built
    .filter((item) => item.members.length > 1)
    .sort(
      (left, right) =>
        right.members.length - left.members.length ||
        left.pattern.name.localeCompare(right.pattern.name),
    );
  const largest = merged.slice(0, 15);
  const located = locateRawPatterns(input.rawPatterns, input.built, input.drops);
  const coverageRows = [...input.rawPatterns]
    .sort((left, right) => left.rawId.localeCompare(right.rawId))
    .map((pattern) => {
      const place = located.get(pattern.rawId);

      if (!place) {
        throw new Error(`Raw pattern ${pattern.rawId} is missing from the coverage table.`);
      }

      const result =
        place.kind === "dropped"
          ? `dropped: ${place.cluster.drop_reason}`
          : place.built.pattern.id;

      return `| ${pattern.rawId} | ${mdCell(pattern.name)} | ${mdCell(result)} |`;
    });

  if (coverageRows.length !== input.rawPatterns.length) {
    throw new Error("Coverage table does not include every raw pattern.");
  }

  const publicationBefore = countBy(
    input.rawPatterns.map((pattern) => pattern.source.publication || "(none)"),
  );
  const publicationAfter = countBy(kept.flatMap((pattern) => publicationOf(pattern)));
  const categoryBefore = countBy(input.rawPatterns.map((pattern) => pattern.category));
  const categoryAfter = countBy(kept.map((pattern) => pattern.category));
  const featureBefore = countBy(input.rawPatterns.flatMap((pattern) => pattern.feature_types));
  const featureAfter = countBy(kept.flatMap((pattern) => pattern.feature_types));

  return [
    "# Curation report",
    "",
    `- Raw extracted patterns: ${input.rawPatterns.length}`,
    `- Final curated patterns: ${kept.length}`,
    `- Merged clusters: ${merged.length}`,
    `- Raw patterns merged away: ${input.rawPatterns.length - kept.length - droppedRaw}`,
    `- Dropped clusters: ${input.drops.length}`,
    `- Dropped raw patterns: ${droppedRaw}`,
    "",
    "## Operator name merges",
    "",
    ...(input.merges.length > 0
      ? [
          "| From | To |",
          "| --- | --- |",
          ...input.merges.map((merge) => `| ${mdCell(merge.from)} | ${mdCell(merge.to)} |`),
        ]
      : ["- None"]),
    "",
    "## Largest merged clusters",
    "",
    ...(largest.length > 0
      ? largest.flatMap((item) => [
          `### ${item.pattern.name} (${item.members.length}) → \`${item.pattern.id}\``,
          "",
          item.cluster.rationale,
          "",
          ...item.members.map((member) => `- ${member.name} (\`${member.rawId}\`)`),
          "",
        ])
      : ["- None", ""]),
    ...(merged.length > largest.length
      ? [`${merged.length - largest.length} smaller merged clusters are not listed above.`, ""]
      : []),
    "## Top 10 most-cited operators",
    "",
    "| Operator | Citations |",
    "| --- | ---: |",
    ...topOperators.map(([operator, count]) => `| ${mdCell(operator)} | ${count} |`),
    "",
    "Kept counts final patterns that still carry the value. A merged pattern can count toward more than one publication or feature type.",
    "",
    ...beforeAfterLines("Publication coverage", publicationBefore, publicationAfter),
    ...beforeAfterLines("Category coverage", categoryBefore, categoryAfter),
    ...beforeAfterLines("Feature type coverage", featureBefore, featureAfter),
    "## Coverage gaps",
    "",
    ...(input.gaps.length > 0
      ? input.gaps.map((gap) => `- ${gap.kind} \`${gap.value}\`: ${gap.explanation}`)
      : ["- None. Every publication, category, and feature type in the raw set is still present on a kept pattern."]),
    "",
    "## Preserved concepts",
    "",
    ...input.preserveNotes.map((note) => `- ${note}`),
    "",
    "## Redirects",
    "",
    "| Old id | Old name | New id | New name | Score | Redirect |",
    "| --- | --- | --- | --- | ---: | --- |",
    ...input.redirectRows.map(
      (row) =>
        `| ${mdCell(row.oldId)} | ${mdCell(row.oldName)} | ${mdCell(row.newId)} | ${mdCell(row.newName)} | ${row.score.toFixed(3)} | ${row.manual ? "override" : row.redirect ? "yes" : "no"} |`,
    ),
    "",
    "## Dropped clusters",
    "",
    ...(input.drops.length > 0
      ? input.drops.flatMap((cluster) => {
          const members = cluster.pattern_ids.map((id) => {
            const pattern = input.rawPatterns.find((candidate) => candidate.rawId === id);
            return `- ${pattern?.name ?? id} (\`${id}\`)`;
          });

          return [`### ${cluster.canonical_name}`, "", cluster.drop_reason, "", ...members, ""];
        })
      : ["- None", ""]),
    "## Coverage table",
    "",
    "| Raw id | Raw name | Result |",
    "| --- | --- | --- |",
    ...coverageRows,
    "",
    "## Excerpt check",
    "",
    ...input.excerptLines,
  ].join("\n");
}

function buildClusterPrompt(patterns: AnnotatedPattern[]): string {
  const patternSummaries = patterns.map(({ rawId, name, one_liner, definition, category }) => ({
    id: rawId,
    name,
    category,
    one_liner,
    definition,
  }));

  return `Below are AI eval patterns extracted from interviews, newsletters, and talks. Cluster them for a library whose priority is high quality and maximum coverage of distinct techniques. There is no target count. Let these rules decide how many patterns remain.

Output JSON: { "clusters": [{ "canonical_name": "<technique name>", "pattern_ids": ["<id>"], "rationale": "<one sentence>", "drop": false, "drop_reason": "" }] }

Rules:
- Every pattern id appears in exactly one cluster.
- A kept pattern must pass all four tests. (1) It measures the quality, correctness, safety, or capability of an AI system's outputs or behavior, or it validates the measuring instrument. It is not org productivity, a business KPI, cost or model-choice economics, or a launch tactic. (2) It has a concrete, repeatable procedure that ends in a decision signal: a pass/fail, score, rate, threshold, or comparison. (3) A team building an AI product can run it on their own product and data. (4) It is distinct. Sub-steps and variants merge into their parent. They are not dropped and they are not separate patterns.
- MERGE true duplicates AND sub-steps or variants into their parent technique. Example: judge alignment, judge calibration, judge precision-recall, and train/dev/test for judges become one pattern for validating an LLM judge against human labels. Example: open coding, axial coding, error analysis on traces, and failed-trajectory analysis become one error-analysis family unless a member is a genuinely separate technique.
- KEEP SEPARATE techniques that are built differently, even when they are related. LLM-as-a-judge, code-based evaluators, human preference tests, production monitoring, and RAG retrieval metrics stay separate.
- The cluster for LLM-as-a-judge grading must be named exactly "LLM-as-a-Judge". Binary pass/fail for one failure mode, including pass/fail instead of a Likert scale and pointwise judging, belongs inside that pattern.
- Keep "Statistical Score Correction using Judge Error Rates" as its own pattern when a note describes correcting a judge's pass rate with its false-positive and false-negative rates. Do not fold that method into judge validation.
- Keep "Three-Layer Model Safety Evaluation" as its own pattern when a note describes the mechanistic, lab, and deployment layers of model safety. Do not fold that method into a generic model-swap eval.
- A useful caveat or limitation of a real technique goes in that technique's cluster, so it can be folded into pitfalls. Do not leave it as its own pattern.
- DROP (drop true, plus a short drop_reason) anything that fails one of those four tests: general product or engineering-management advice, launch tactics, sales or marketing uses, org-productivity measurement, business KPIs, cost or model-choice economics, and opinions or caveats with no method. Examples: "Capability Evals as Sales Collateral", "Dogfooding Buzz as a Launch Signal", "Developer Survey-Based Impact Measurement", "Time to Value", "AI Tool Productivity Impact Measurement", "Economic Turing Test".
- When drop is false, set drop_reason to "".
- canonical_name is a short name for the parent technique. Use a member's name when it is already precise. When you merge variants, name the parent technique.
- A real technique with no duplicate or sub-step stays a cluster of size 1.
- Do not drop a real technique just to make the library smaller. Distinct techniques should survive.

Patterns:
${JSON.stringify(patternSummaries)}`;
}

async function clusterPatterns(
  patterns: AnnotatedPattern[],
): Promise<{ clusters: Cluster[]; costUsd: number }> {
  let note = "";
  let costUsd = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await chatJson(clusterResponseSchema, {
      model: models.cluster,
      name: "clusters",
      // Reasoning models spend tokens thinking before emitting the answer.
      // A small cap gets consumed entirely by reasoning, leaving empty content,
      // so give the call ample headroom.
      max_tokens: 64_000,
      messages: [{ role: "user", content: `${buildClusterPrompt(patterns)}${note}` }],
    });
    costUsd += result.costUsd;

    try {
      const clusters = normalizeClusters(result.data.clusters, patterns);
      return { clusters, costUsd };
    } catch (error: unknown) {
      if (attempt === 2) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      note = `

Your previous response was invalid: ${message}
Return a corrected JSON object where every pattern id appears exactly once and only once.`;
    }
  }

  throw new Error("Failed to cluster patterns.");
}

async function clusterPatternBatch(
  patterns: AnnotatedPattern[],
): Promise<{ clusters: Cluster[]; costUsd: number }> {
  const batchPatterns = patterns.map((pattern, index) => ({
    ...pattern,
    rawId: `pattern-${String(index + 1).padStart(3, "0")}`,
  }));
  const originalIdsByBatchId = new Map(
    batchPatterns.map((pattern, index) => [pattern.rawId, patterns[index].rawId]),
  );
  const { clusters, costUsd } = await clusterPatterns(batchPatterns);

  return {
    costUsd,
    clusters: clusters.map((cluster) => ({
      ...cluster,
      pattern_ids: cluster.pattern_ids.map((id) => {
        const originalId = originalIdsByBatchId.get(id);

        if (!originalId) {
          throw new Error(`Cluster references unknown batch pattern id: ${id}`);
        }

        return originalId;
      }),
    })),
  };
}

function normalizeClusters(clusters: Cluster[], patterns: AnnotatedPattern[]): Cluster[] {
  const known = new Set(patterns.map((pattern) => pattern.rawId));
  const seen = new Set<string>();
  const normalized: Cluster[] = [];

  for (const cluster of clusters) {
    const patternIds: string[] = [];

    for (const id of cluster.pattern_ids) {
      if (!known.has(id)) {
        throw new Error(`Cluster references unknown pattern id: ${id}`);
      }

      if (seen.has(id)) {
        throw new Error(`Pattern appears in multiple clusters: ${id}`);
      }

      seen.add(id);
      patternIds.push(id);
    }

    const canonicalName = cluster.canonical_name.trim();

    if (!canonicalName) {
      throw new Error("A cluster has an empty canonical_name.");
    }

    if (cluster.drop && !cluster.drop_reason.trim()) {
      throw new Error(`Dropped cluster "${canonicalName}" has no drop_reason.`);
    }

    normalized.push({
      ...cluster,
      canonical_name: canonicalName,
      pattern_ids: patternIds,
      drop_reason: cluster.drop ? cluster.drop_reason.trim() : "",
    });
  }

  if (seen.size !== patterns.length) {
    const missing = patterns
      .filter((pattern) => !seen.has(pattern.rawId))
      .map((pattern) => `${pattern.rawId} (${pattern.name})`);
    throw new Error(`Some patterns were not clustered: ${missing.join(", ")}`);
  }

  return normalized;
}

function buildSynthesisPrompt(group: AnnotatedPattern[], suggestedName: string): string {
  const members = group.map((pattern) => ({
    name: pattern.name,
    category: pattern.category,
    feature_types: pattern.feature_types,
    difficulty: pattern.difficulty,
    definition: pattern.definition,
    explanation: pattern.explanation,
    when_to_use: pattern.when_to_use,
    when_not_to_use: pattern.when_not_to_use,
    common_pitfalls: pattern.common_pitfalls,
    metric_or_method: pattern.metric_or_method,
    keywords: pattern.keywords,
  }));

  return `Merge these ${group.length} extracted notes into ONE eval-library pattern. They are the same technique, or sub-steps and variants of it.

Suggested name: ${suggestedName}
${
  suggestedName === JUDGE_NAME
    ? "\nThis pattern must be named exactly LLM-as-a-Judge. State that a binary pass/fail decision for one failure mode is the recommended practice, and that a Likert scale is the weaker alternative.\n"
    : ""
}
Write the merged pattern from ALL members:
- name: one name for the parent technique
- definition: one definition of the method
- explanation: prose that states the method and then covers the variants and sub-steps. A reader should see what each member contributed.
- when_to_use, when_not_to_use, common_pitfalls: merge the members' lists, drop repeats, and fold caveats or limitations into pitfalls or when_not_to_use. Keep at most 8 bullets in each list.
- one_liner: under 120 characters
- metric_or_method, category, difficulty, feature_types, keywords, codex_prompt_template: one coherent set. Include every member feature type that still applies. codex_prompt_template is a prompt a PM can paste into a coding agent, with at least one [PLACEHOLDER] when the technique can be implemented that way, otherwise "".

Use only claims present in the members. Do not add techniques, numbers, or sources. Do not write a source excerpt.

Members:
${JSON.stringify(members)}`;
}

async function synthesizeGroup(
  group: AnnotatedPattern[],
  suggestedName: string,
): Promise<{ data: Synthesis; costUsd: number }> {
  let note = "";
  let costUsd = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await chatJson(synthesisSchema, {
      model: models.pipeline,
      name: "merged_pattern",
      max_tokens: 32_000,
      messages: [{ role: "user", content: `${buildSynthesisPrompt(group, suggestedName)}${note}` }],
    });
    costUsd += result.costUsd;
    const data = result.data;

    if (data.name.trim() && data.definition.trim() && data.explanation.trim()) {
      return { data, costUsd };
    }

    if (attempt === 2) {
      throw new Error(`Synthesis for "${suggestedName}" returned empty prose.`);
    }

    note = "\n\nYour previous response had an empty name, definition, or explanation. Fill all three.";
  }

  throw new Error(`Synthesis for "${suggestedName}" failed.`);
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

type FilesToProcess = {
  files: Array<{
    file: string;
    publication: string;
    title: string;
    operator: string;
    date: string;
    url?: string;
    eval_relevance?: number;
  }>;
};

type PreviousPattern = {
  id: string;
  name: string;
  definition: string;
  source_file: string;
  sources?: Array<{ file: string }>;
};

const previousSchema = z.array(
  z
    .object({
      id: z.string(),
      name: z.string(),
      definition: z.string(),
      source_file: z.string(),
      sources: z.array(z.object({ file: z.string() }).passthrough()).optional(),
    })
    .passthrough(),
);

function cosine(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftNorm) * Math.sqrt(rightNorm);
  return denominator === 0 ? 0 : dot / denominator;
}

async function embedTexts(texts: string[]): Promise<{ vectors: number[][]; costUsd: number }> {
  const vectors: number[][] = [];
  let costUsd = 0;

  for (let offset = 0; offset < texts.length; offset += 100) {
    const batch = texts.slice(offset, offset + 100);
    await assertBudget();
    const response = await getOpenRouter().embeddings.create(
      { model: models.embed, input: batch },
      { timeout: pipelineTimeoutMs },
    );
    const batchCost = usageCostUsd(response.usage);
    costUsd += batchCost;
    await recordSpend(batchCost);

    if (response.data.length !== batch.length) {
      throw new Error(`Expected ${batch.length} embeddings, received ${response.data.length}.`);
    }

    const ordered = [...response.data].sort((left, right) => left.index - right.index);

    for (const item of ordered) {
      vectors.push(item.embedding);
    }
  }

  return { vectors, costUsd };
}

async function nearestRedirects(
  previous: PreviousPattern[],
  next: EvalPattern[],
): Promise<{ redirects: Record<string, string>; rows: RedirectRow[]; costUsd: number }> {
  if (next.length === 0) {
    throw new Error("Cannot build redirects without curated patterns.");
  }

  const texts = [
    ...previous.map((pattern) => `${pattern.name}\n${pattern.definition}`),
    ...next.map((pattern) => `${pattern.name}\n${pattern.definition}`),
  ];
  const { vectors, costUsd } = await embedTexts(texts);
  const oldVectors = vectors.slice(0, previous.length);
  const newVectors = vectors.slice(previous.length);
  const nextIds = new Set(next.map((pattern) => pattern.id));
  const rows: RedirectRow[] = [];
  const redirects: Record<string, string> = {};

  for (let index = 0; index < previous.length; index += 1) {
    let best = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let candidate = 0; candidate < next.length; candidate += 1) {
      const score = cosine(oldVectors[index], newVectors[candidate]);
      const closer =
        score > bestScore || (score === bestScore && next[candidate].id < next[best].id);

      if (closer) {
        best = candidate;
        bestScore = score;
      }
    }

    const oldPattern = previous[index];
    const overrideId = REDIRECT_OVERRIDES[oldPattern.id];
    let destination = next[best];
    let score = bestScore;
    let manual = false;

    if (overrideId) {
      const overrideIndex = next.findIndex((pattern) => pattern.id === overrideId);

      if (overrideIndex === -1) {
        throw new Error(`Redirect override ${oldPattern.id} → ${overrideId} is not a curated pattern.`);
      }

      destination = next[overrideIndex];
      score = cosine(oldVectors[index], newVectors[overrideIndex]);
      manual = true;
    }

    const redirect = manual || (!nextIds.has(oldPattern.id) && destination.id !== oldPattern.id);

    if (redirect) {
      redirects[oldPattern.id] = destination.id;
    }

    rows.push({
      oldId: oldPattern.id,
      oldName: oldPattern.name,
      newId: destination.id,
      newName: destination.name,
      score,
      redirect,
      manual,
    });
  }

  rows.sort((left, right) => left.oldId.localeCompare(right.oldId));

  return {
    costUsd,
    rows,
    redirects: Object.fromEntries(Object.entries(redirects).sort((left, right) => left[0].localeCompare(right[0]))),
  };
}

function isPreservedName(name: string): boolean {
  return PRESERVE_RULES.some((rule) => rule.canonicalName === name);
}

function separatePreserved(
  clusters: Cluster[],
  patterns: AnnotatedPattern[],
): { clusters: Cluster[]; notes: string[] } {
  const notes: string[] = [];
  let next = clusters.map((cluster) => ({ ...cluster, pattern_ids: [...cluster.pattern_ids] }));

  for (const rule of PRESERVE_RULES) {
    const matched = patterns.filter((pattern) => rule.matches(pattern));

    if (matched.length === 0) {
      notes.push(`${rule.label}: did not re-appear as a raw pattern.`);
      continue;
    }

    const ids = new Set(matched.map((pattern) => pattern.rawId));
    const pulled: string[] = [];
    const remainder: Cluster[] = [];

    for (const cluster of next) {
      const keptIds = cluster.pattern_ids.filter((id) => ids.has(id));
      const rest = cluster.pattern_ids.filter((id) => !ids.has(id));

      if (keptIds.length === 0) {
        remainder.push(cluster);
        continue;
      }

      pulled.push(...keptIds);

      if (rest.length > 0) {
        remainder.push({ ...cluster, pattern_ids: rest });
      }
    }

    remainder.push({
      canonical_name: rule.canonicalName,
      pattern_ids: pulled,
      rationale: "Kept as its own technique so the method stays intact.",
      drop: false,
      drop_reason: "",
    });
    next = remainder;
    notes.push(
      `${rule.label}: kept as its own pattern from ${matched.map((pattern) => `${pattern.name} (${pattern.rawId})`).join("; ")}.`,
    );
  }

  return { clusters: next, notes };
}

function isJudgeMember(pattern: AnnotatedPattern): boolean {
  return /llm-as-a-judge|binary pass\/fail|pass\/fail over likert|pointwise over pairwise|binary llm/.test(
    pattern.name.toLowerCase(),
  );
}

function foldJudgeCluster(clusters: Cluster[], patterns: AnnotatedPattern[]): Cluster[] {
  const byId = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));
  let best: Cluster | undefined;
  let bestScore = 0;

  for (const cluster of clusters) {
    if (cluster.drop || isPreservedName(cluster.canonical_name)) {
      continue;
    }

    const score = cluster.pattern_ids.reduce((total, id) => {
      const name = byId.get(id)?.name.toLowerCase() ?? "";
      return total + (/llm-as-a-judge/.test(name) ? 3 : 0);
    }, 0);

    if (score > bestScore) {
      best = cluster;
      bestScore = score;
    }
  }

  if (!best || bestScore < 3) {
    return clusters;
  }

  const absorb = clusters.filter((cluster) => {
    if (cluster === best || cluster.drop || isPreservedName(cluster.canonical_name)) {
      return false;
    }

    const members = cluster.pattern_ids.map((id) => byId.get(id)).filter((pattern) => pattern !== undefined);
    return members.length > 0 && members.every((pattern) => isJudgeMember(pattern));
  });

  return clusters.flatMap((cluster) => {
    if (absorb.includes(cluster)) {
      return [];
    }

    if (cluster !== best) {
      return [cluster];
    }

    return [
      {
        ...cluster,
        canonical_name: JUDGE_NAME,
        pattern_ids: [...cluster.pattern_ids, ...absorb.flatMap((item) => item.pattern_ids)],
      },
    ];
  });
}

function relevantPassage(body: string, excerpt: string): string {
  if (body.length <= 80_000) {
    return body;
  }

  const probes = normalizeExcerptProbe(excerpt);
  const lower = body.toLowerCase();

  for (const probe of probes) {
    const at = lower.indexOf(probe.toLowerCase());

    if (at !== -1) {
      return body.slice(Math.max(0, at - 6_000), Math.min(body.length, at + 14_000));
    }
  }

  return body.slice(0, 80_000);
}

function normalizeExcerptProbe(excerpt: string): string[] {
  const words = excerpt
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((word) => word.length > 4);
  const probes: string[] = [];

  for (let index = 0; index + 3 <= words.length && probes.length < 8; index += 3) {
    probes.push(words.slice(index, index + 3).join(" "));
  }

  return probes;
}

const repairSchema = z.object({
  source_excerpt: z.string(),
});

async function repairExcerpt(
  pattern: AnnotatedPattern,
  body: string,
): Promise<{ excerpt: string; costUsd: number }> {
  const result = await chatJson(repairSchema, {
    model: models.pipeline,
    name: "verbatim_excerpt",
    max_tokens: 16_000,
    messages: [
      {
        role: "user",
        content: `Copy one verbatim excerpt from the source passage that supports this eval pattern.

Rules:
- Copy the source text exactly.
- You may delete [m:ss] timestamps.
- You may join separated parts with [...].
- Do not paraphrase, fix grammar, or add words.
- Keep the excerpt under 120 words.

Pattern: ${pattern.name}
Definition: ${pattern.definition}

SOURCE PASSAGE:
${relevantPassage(body, pattern.source_excerpt)}`,
      },
    ],
  });

  return { excerpt: result.data.source_excerpt.trim(), costUsd: result.costUsd };
}

async function verifyExcerpts(
  draft: Omit<EvalPattern, "id">,
  group: AnnotatedPattern[],
  bodies: Map<string, string>,
  relevanceByFile: Map<string, number>,
): Promise<{ pattern: Omit<EvalPattern, "id">; row: ExcerptRow; costUsd: number }> {
  const bodyOf = (pattern: AnnotatedPattern) => bodies.get(pattern.source.file) ?? "";
  const passers = group.filter((pattern) => excerptMatches(pattern.source_excerpt, bodyOf(pattern)));
  let primary: AnnotatedPattern;
  let excerpt: string;
  let status: ExcerptRow["primary"];
  let costUsd = 0;

  const passingPrimary = choosePrimaryMember(group, passers, relevanceByFile);

  if (passingPrimary) {
    primary = passingPrimary;
    excerpt = primary.source_excerpt;
    status = "pass";
  } else {
    primary = choosePrimaryMember(group, group, relevanceByFile) ?? choosePrimaryExcerpt(group);
    const body = bodyOf(primary);
    const repaired = await repairExcerpt(primary, body);
    costUsd += repaired.costUsd;

    if (!excerptMatches(repaired.excerpt, body)) {
      throw new Error(
        `Primary excerpt for "${draft.name}" still does not match ${primary.source.file} after a verbatim repair.`,
      );
    }

    excerpt = repaired.excerpt;
    status = "repaired";
  }

  if (!excerptMatches(excerpt, bodyOf(primary))) {
    throw new Error(`Primary excerpt for "${draft.name}" failed the verbatim check.`);
  }

  const cited: Array<{ pattern: AnnotatedPattern; excerpt: string }> = [];
  const dropped: string[] = [];

  for (const pattern of group) {
    if (pattern === primary) {
      continue;
    }

    if (passers.includes(pattern)) {
      cited.push({ pattern, excerpt: pattern.source_excerpt });
      continue;
    }

    const repaired = await repairExcerpt(pattern, bodyOf(pattern));
    costUsd += repaired.costUsd;

    if (excerptMatches(repaired.excerpt, bodyOf(pattern))) {
      cited.push({ pattern, excerpt: repaired.excerpt });
      continue;
    }

    dropped.push(`${pattern.name} (${pattern.source.file})`);
  }

  const sources = [
    { ...primary.source, excerpt },
    ...cited.map((item) => ({ ...item.pattern.source, excerpt: item.excerpt })),
  ];

  for (const source of sources) {
    const body = bodies.get(source.file) ?? "";

    if (!excerptMatches(source.excerpt, body)) {
      throw new Error(`Citation excerpt for "${draft.name}" failed in ${source.file}.`);
    }
  }

  const next: Omit<EvalPattern, "id"> = {
    ...draft,
    ...sourceFields(primary),
    source_excerpt: excerpt,
  };

  if (sources.length > 1) {
    next.sources = sources;
  } else {
    delete next.sources;
  }

  return {
    costUsd,
    pattern: next,
    row: { name: next.name, primary: status, dropped },
  };
}

function excerptReport(rows: Array<ExcerptRow & { id: string }>): string[] {
  const repaired = rows.filter((row) => row.primary === "repaired");
  const dropped = rows.filter((row) => row.dropped.length > 0);
  const primaryMisses = rows.filter((row) => row.primary !== "pass" && row.primary !== "repaired");

  return [
    `- Patterns checked: ${rows.length}`,
    `- Primary misses: ${primaryMisses.length}`,
    `- Primary excerpts repaired: ${repaired.length}`,
    `- Patterns with a dropped secondary citation: ${dropped.length}`,
    `- Secondary citations removed: ${rows.reduce((count, row) => count + row.dropped.length, 0)}`,
    ...rows.map(
      (row) =>
        `- ${row.id}: primary ${row.primary}${row.dropped.length > 0 ? `; dropped secondary: ${row.dropped.join("; ")}` : ""}`,
    ),
  ];
}

async function loadPublishedPatterns(projectRoot: string): Promise<PreviousPattern[]> {
  const { stdout } = await execFileAsync("git", ["show", "main:data/evals.json"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const published = previousSchema.parse(JSON.parse(String(stdout)));

  if (published.length !== 43) {
    throw new Error(`Expected 43 published pattern ids on main, found ${published.length}.`);
  }

  return published;
}

function readCoverage(report: string): Map<string, { name: string; result: string }> {
  const coverage = new Map<string, { name: string; result: string }>();

  for (const line of report.split("\n")) {
    const match = /^\| (raw-\d+) \| (.*) \| (.*) \|$/.exec(line);

    if (!match) {
      continue;
    }

    coverage.set(match[1], { name: match[2].trim(), result: match[3].trim() });
  }

  return coverage;
}

async function enforceBar(input: {
  patterns: AnnotatedPattern[];
  filesToProcess: FilesToProcess;
  published: PreviousPattern[];
  merges: OperatorMerge[];
  evalsPath: string;
  projectRoot: string;
}): Promise<void> {
  const reportPath = path.join(input.projectRoot, "data", "curation-report.md");
  const coverage = readCoverage(await readFile(reportPath, "utf8"));
  const current = z.array(evalPatternSchema).parse(JSON.parse(await readFile(input.evalsPath, "utf8")));
  const currentById = new Map(current.map((pattern) => [pattern.id, pattern]));
  const groups = new Map<string, AnnotatedPattern[]>();
  const previouslyDropped: Array<{ pattern: AnnotatedPattern; reason: string }> = [];

  for (const pattern of input.patterns) {
    const row = coverage.get(pattern.rawId);

    if (!row) {
      throw new Error(`Coverage table has no row for ${pattern.rawId}.`);
    }

    if (row.name !== pattern.name) {
      throw new Error(`Coverage row ${pattern.rawId} is "${row.name}", not "${pattern.name}".`);
    }

    if (row.result.startsWith("dropped:")) {
      previouslyDropped.push({
        pattern,
        reason: row.result.replace(/^dropped:\s*/, ""),
      });
      continue;
    }

    const members = groups.get(row.result) ?? [];
    members.push(pattern);
    groups.set(row.result, members);
  }

  const barDropped: AnnotatedPattern[] = [];

  for (const id of BAR_DROPS) {
    const members = groups.get(id);

    if (!members) {
      throw new Error(`Pattern to drop is missing: ${id}`);
    }

    barDropped.push(...members);
    groups.delete(id);
  }

  const synthesizeIds = new Set<string>([RESCUED_PARENT_ID]);

  for (const merge of BAR_MERGES) {
    const child = groups.get(merge.child);
    const parent = groups.get(merge.parent);

    if (!child || !parent) {
      throw new Error(`Merge ${merge.child} → ${merge.parent} is missing a pattern.`);
    }

    groups.set(merge.parent, [...parent, ...child]);
    groups.delete(merge.child);
    synthesizeIds.add(merge.parent);
  }

  const rescued = previouslyDropped.filter((item) => item.pattern.name === RESCUED_RAW_NAME);

  if (rescued.length !== 1 || rescued[0]?.pattern.rawId !== "raw-039") {
    throw new Error(`Expected raw-039 "${RESCUED_RAW_NAME}" in the dropped set.`);
  }

  const parentMembers = groups.get(RESCUED_PARENT_ID);

  if (!parentMembers) {
    throw new Error(`${RESCUED_PARENT_ID} is missing.`);
  }

  groups.set(RESCUED_PARENT_ID, [...parentMembers, rescued[0].pattern]);

  const stillDropped = previouslyDropped.filter((item) => item.pattern.name !== RESCUED_RAW_NAME);
  const docs = await loadCorpus(undefined, { quiet: true });
  const bodies = new Map(docs.map((doc) => [doc.file, doc.body]));
  const relevanceByFile = new Map(
    input.filesToProcess.files.map((file) => [file.file, file.eval_relevance ?? 0]),
  );
  const synthesisById = new Map<string, Synthesis>();
  let synthesisCost = 0;
  const toSynthesize = [...synthesizeIds];

  console.log(`Re-synthesizing ${toSynthesize.length} patterns after the bar edits.`);

  await runBatch(toSynthesize, synthesisConcurrency, async (id, index) => {
    const members = groups.get(id);
    const existing = currentById.get(id);

    if (!members || !existing) {
      throw new Error(`Cannot synthesize ${id}.`);
    }

    const result = await synthesizeGroup(members, existing.name);
    synthesisById.set(id, { ...result.data, name: existing.name });
    synthesisCost += result.costUsd;
    console.log(`[${index + 1}/${toSynthesize.length}] synthesized ${existing.name} (${members.length} members)`);
  });

  const built: BuiltPattern[] = [];
  const excerptRows: Array<ExcerptRow & { id: string }> = [];
  let repairCost = 0;

  for (const [id, members] of groups) {
    const existing = currentById.get(id);

    if (!existing) {
      throw new Error(`Kept pattern ${id} is not in the current library.`);
    }

    const synthesis = synthesisById.get(id);
    const { id: existingId, ...existingFields } = existing;
    const draft = synthesis
      ? { ...synthesizedPattern(members, synthesis), name: existing.name }
      : existingFields;
    const verified = await verifyExcerpts(draft, members, bodies, relevanceByFile);
    repairCost += verified.costUsd;
    const cluster: Cluster = {
      canonical_name: existing.name,
      pattern_ids: members.map((member) => member.rawId),
      rationale: synthesis
        ? "Re-synthesized so this pattern absorbs the patterns merged into it."
        : "Kept.",
      drop: false,
      drop_reason: "",
    };

    built.push({
      cluster,
      members,
      pattern: { ...existing, ...verified.pattern, id: existingId, name: existing.name },
    });
    excerptRows.push({ id, ...verified.row, name: existing.name });
  }

  const dropReasons = new Map<string, AnnotatedPattern[]>();

  for (const item of stillDropped) {
    const members = dropReasons.get(item.reason) ?? [];
    members.push(item.pattern);
    dropReasons.set(item.reason, members);
  }

  dropReasons.set(
    "Fails the eval-pattern bar: it does not measure AI output quality with a repeatable decision signal a product team can run on its own product.",
    barDropped,
  );

  const drops: Cluster[] = [...dropReasons.entries()].map(([reason, members]) => ({
    canonical_name: reason,
    pattern_ids: members.map((member) => member.rawId),
    rationale: reason,
    drop: true,
    drop_reason: reason,
  }));
  const validated = z.array(evalPatternSchema).parse(built.map((item) => item.pattern));

  if (validated.length !== 76) {
    throw new Error(`Expected 76 patterns after the bar edits, found ${validated.length}.`);
  }

  validated.sort((left, right) => left.id.localeCompare(right.id));

  for (const pattern of validated) {
    if (!excerptMatches(pattern.source_excerpt, bodies.get(pattern.source_file) ?? "")) {
      throw new Error(`Primary excerpt failed for ${pattern.id}.`);
    }

    for (const source of pattern.sources ?? []) {
      if (!excerptMatches(source.excerpt, bodies.get(source.file) ?? "")) {
        throw new Error(`Secondary excerpt failed for ${pattern.id} in ${source.file}.`);
      }
    }
  }

  const gaps = auditCoverage(input.patterns, built, drops);
  const mapped = await nearestRedirects(input.published, validated);
  const preserveNotes = PRESERVE_RULES.map((rule) => {
    const kept = validated.find((pattern) => rule.canonicalName === pattern.name);
    const row = mapped.rows.find((candidate) => candidate.oldName === rule.label);
    const nearest = row
      ? ` Published "${rule.label}" is nearest to ${row.newId} (${row.newName}, score ${row.score.toFixed(3)}).`
      : "";

    return kept
      ? `${rule.label}: kept as ${kept.id}.${nearest}`
      : `${rule.label}: not a separate kept pattern.${nearest}`;
  });
  const excerptLines = excerptReport(excerptRows.sort((left, right) => left.id.localeCompare(right.id)));
  const primaryMisses = excerptLines.find((line) => line.startsWith("- Primary misses: "));

  if (primaryMisses && !primaryMisses.endsWith("0")) {
    throw new Error("Excerpt check found a primary miss.");
  }

  await mkdir(path.join(input.projectRoot, "data"), { recursive: true });
  await writeFile(input.evalsPath, `${JSON.stringify(validated, null, 2)}\n`);
  await writeFile(
    path.join(input.projectRoot, "data", "id-redirects.json"),
    `${JSON.stringify(mapped.redirects, null, 2)}\n`,
  );
  await writeFile(
    reportPath,
    `${buildReport({
      rawPatterns: input.patterns,
      built,
      drops,
      merges: input.merges,
      gaps,
      excerptLines,
      preserveNotes,
      redirectRows: mapped.rows,
    })}\n`,
  );

  const total = await spentUsd();
  console.log(
    `Curated ${input.patterns.length} raw patterns into ${validated.length} final patterns. Dropped ${drops.length} clusters.`,
  );
  console.log(
    `Cost this run: $${(synthesisCost + repairCost + mapped.costUsd).toFixed(4)}. Total pipeline spend: $${total.toFixed(4)}.`,
  );
}

async function main(): Promise<void> {
  const projectRoot = process.cwd();
  const extractedDir = path.join(projectRoot, "data", "extracted");
  const evalsPath = path.join(projectRoot, "data", "evals.json");
  const published = await loadPublishedPatterns(projectRoot);
  const backupPath = path.join(projectRoot, "data", "evals.pre-recurate.json");

  try {
    await access(backupPath);
  } catch {
    await copyFile(evalsPath, backupPath);
  }

  const filesToProcess = JSON.parse(
    await readFile(path.join(projectRoot, "data", "files-to-process.json"), "utf8"),
  ) as FilesToProcess;
  const selected = new Map(filesToProcess.files.map((file) => [file.file, file]));
  const extractionFiles = (await readdir(extractedDir))
    .filter((file) => file.endsWith(".json") && !file.startsWith("."))
    .sort();
  const patterns: AnnotatedPattern[] = [];

  for (const extractionFile of extractionFiles) {
    const sourceFile = getSourceFileFromExtractionName(extractionFile);
    const meta = selected.get(sourceFile);

    if (!meta) {
      continue;
    }

    const raw = JSON.parse(
      await readFile(path.join(extractedDir, extractionFile), "utf8"),
    ) as unknown;

    for (const pattern of z.array(rawPatternSchema).parse(raw)) {
      patterns.push({
        ...pattern,
        rawId: `raw-${String(patterns.length + 1).padStart(3, "0")}`,
        source: {
          file: meta.file,
          title: meta.title,
          date: meta.date,
          operator: meta.operator,
          publication: meta.publication,
          ...(meta.url ? { url: meta.url } : {}),
          excerpt: pattern.source_excerpt,
        },
      });
    }
  }

  const missing = filesToProcess.files.filter((file) => {
    const extractionName = `${file.file.replace(/\.md$/, "").replaceAll("/", "__")}.json`;
    return !extractionFiles.includes(extractionName);
  });

  for (const file of missing) {
    console.warn(`No extraction file for ${file.file}; skipping it.`);
  }

  const { normalized: operators, merges } = normalizeOperators(
    patterns.map((pattern) => pattern.source.operator),
  );

  for (const pattern of patterns) {
    pattern.source.operator = operators.get(pattern.source.operator) ?? pattern.source.operator;
  }

  if (merges.length === 0) {
    console.log("Operator merges: none");
  }

  for (const merge of merges) {
    console.log(`Operator merge: ${merge.from} → ${merge.to}`);
  }

  const currentIds = new Set(
    z
      .array(z.object({ id: z.string() }))
      .parse(JSON.parse(await readFile(evalsPath, "utf8")))
      .map((pattern) => pattern.id),
  );
  const barTargetsPresent =
    BAR_DROPS.every((id) => currentIds.has(id)) &&
    BAR_MERGES.every((merge) => currentIds.has(merge.child) && currentIds.has(merge.parent));

  if (barTargetsPresent) {
    await enforceBar({
      patterns,
      filesToProcess,
      published,
      merges,
      evalsPath,
      projectRoot,
    });
    return;
  }

  const { clusters: rawClusters, costUsd: clusterCost } = await clusterPatternBatch(patterns);
  const preserved = separatePreserved(rawClusters, patterns);
  const adjusted = foldJudgeCluster(preserved.clusters, patterns);
  const drops = adjusted.filter((cluster) => cluster.drop);
  const clusters = adjusted.filter((cluster) => !cluster.drop);
  const patternsById = new Map(patterns.map((pattern) => [pattern.rawId, pattern]));
  const multi = clusters.filter((cluster) => cluster.pattern_ids.length > 1);
  const synthesisByKey = new Map<string, Synthesis>();
  let synthesisCost = 0;

  console.log(
    `Clustered ${patterns.length} raw patterns into ${clusters.length} kept and ${drops.length} dropped. Synthesizing ${multi.length} merged clusters.`,
  );

  await runBatch(multi, synthesisConcurrency, async (cluster, index) => {
    const group = membersOf(cluster, patternsById);
    const result = await synthesizeGroup(group, cluster.canonical_name);
    synthesisByKey.set(cluster.pattern_ids.join("\n"), result.data);
    synthesisCost += result.costUsd;
    console.log(
      `[${index + 1}/${multi.length}] synthesized ${result.data.name} (${group.length} members)`,
    );
  });

  const docs = await loadCorpus(undefined, { quiet: true });
  const bodies = new Map(docs.map((doc) => [doc.file, doc.body]));
  const relevanceByFile = new Map(
    filesToProcess.files.map((file) => [file.file, file.eval_relevance ?? 0]),
  );
  const usedIds = new Map<string, number>();
  const built: BuiltPattern[] = [];
  const excerptRows: Array<ExcerptRow & { id: string }> = [];
  let repairCost = 0;

  for (const cluster of clusters) {
    const group = membersOf(cluster, patternsById);
    const only = group[0];

    if (!only) {
      throw new Error(`Cluster "${cluster.canonical_name}" has no members.`);
    }

    let merged =
      group.length > 1
        ? synthesizedPattern(group, requiredSynthesis(cluster, synthesisByKey))
        : singletonPattern(only);

    if (cluster.canonical_name === JUDGE_NAME) {
      merged = {
        ...merged,
        name: JUDGE_NAME,
        explanation: /binary pass\/fail/i.test(merged.explanation)
          ? merged.explanation
          : `${merged.explanation}\n\nThe recommended practice is a binary pass/fail decision for one failure mode.`,
      };
    }

    const verified = await verifyExcerpts(merged, group, bodies, relevanceByFile);
    repairCost += verified.costUsd;
    const baseId = slugify(verified.pattern.name);
    const count = (usedIds.get(baseId) ?? 0) + 1;
    usedIds.set(baseId, count);
    const id = count === 1 ? baseId : `${baseId}-${count}`;

    built.push({
      cluster,
      members: group,
      pattern: { id, ...verified.pattern },
    });
    excerptRows.push({ id, ...verified.row, name: verified.pattern.name });

    if (verified.row.primary === "repaired" || verified.row.dropped.length > 0) {
      console.log(
        `${id}: primary ${verified.row.primary}${verified.row.dropped.length > 0 ? `, dropped ${verified.row.dropped.length} secondary` : ""}`,
      );
    }
  }

  const validated = z.array(evalPatternSchema).parse(built.map((item) => item.pattern));
  const validatedById = new Map(validated.map((pattern) => [pattern.id, pattern]));

  for (const item of built) {
    const parsed = validatedById.get(item.pattern.id);

    if (!parsed) {
      throw new Error(`Curated pattern failed validation: ${item.pattern.name}`);
    }

    item.pattern = parsed;
  }

  validated.sort((left, right) => left.id.localeCompare(right.id));

  if (validated.length === 0) {
    throw new Error("Curation kept no patterns.");
  }

  for (const pattern of validated) {
    if (!excerptMatches(pattern.source_excerpt, bodies.get(pattern.source_file) ?? "")) {
      throw new Error(`Primary excerpt failed for ${pattern.id}.`);
    }

    for (const source of pattern.sources ?? []) {
      if (!excerptMatches(source.excerpt, bodies.get(source.file) ?? "")) {
        throw new Error(`Secondary excerpt failed for ${pattern.id} in ${source.file}.`);
      }
    }
  }

  const gaps = auditCoverage(patterns, built, drops);
  const mapped = await nearestRedirects(published, validated);
  const preserveNotes = [...preserved.notes];

  for (const rule of PRESERVE_RULES) {
    const row = mapped.rows.find((candidate) => candidate.oldName === rule.label);

    if (row) {
      preserveNotes.push(
        `Published "${rule.label}" is nearest to ${row.newId} (${row.newName}, score ${row.score.toFixed(3)}).`,
      );
    }
  }

  const costUsd = clusterCost + synthesisCost + repairCost + mapped.costUsd;
  const excerptLines = excerptReport(excerptRows.sort((left, right) => left.id.localeCompare(right.id)));

  if (excerptLines.some((line) => line.startsWith("- Primary misses: ") && !line.endsWith("0"))) {
    throw new Error("Excerpt check found a primary miss.");
  }

  await mkdir(path.join(projectRoot, "data"), { recursive: true });
  await writeFile(evalsPath, `${JSON.stringify(validated, null, 2)}\n`);
  await writeFile(
    path.join(projectRoot, "data", "id-redirects.json"),
    `${JSON.stringify(mapped.redirects, null, 2)}\n`,
  );
  await writeFile(
    path.join(projectRoot, "data", "curation-report.md"),
    `${buildReport({
      rawPatterns: patterns,
      built,
      drops,
      merges,
      gaps,
      excerptLines,
      preserveNotes,
      redirectRows: mapped.rows,
    })}\n`,
  );

  const total = await spentUsd();
  console.log(
    `Curated ${patterns.length} raw patterns into ${validated.length} final patterns. Dropped ${drops.length} clusters.`,
  );
  console.log(`Cost this run: $${costUsd.toFixed(4)}. Total pipeline spend: $${total.toFixed(4)}.`);
}

function membersOf(cluster: Cluster, patternsById: Map<string, AnnotatedPattern>): AnnotatedPattern[] {
  return cluster.pattern_ids.map((id) => {
    const pattern = patternsById.get(id);

    if (!pattern) {
      throw new Error(`Cluster references unknown pattern id: ${id}`);
    }

    return pattern;
  });
}

function requiredSynthesis(cluster: Cluster, synthesisByKey: Map<string, Synthesis>): Synthesis {
  const synthesis = synthesisByKey.get(cluster.pattern_ids.join("\n"));

  if (!synthesis) {
    throw new Error(`Missing synthesis for "${cluster.canonical_name}".`);
  }

  return synthesis;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
