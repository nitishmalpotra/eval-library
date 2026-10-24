import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getAllEvals } from "../src/lib/evals";
import {
  decideFind,
  drainFindTraces,
  enableFindTraces,
  findEvals,
  SIM_FLOOR,
  type FindTrace,
} from "../src/lib/find";
import type { FindResult } from "../src/lib/findTypes";
import { models } from "../src/lib/openrouter";
import { loadSearchEvals, type SearchEvalCase } from "./lib/search-evals";

const HARD_GATES = {
  junkRejection: 0.95,
  falseRejection: 0.05,
  primaryRecallAt5: 0.9,
  p95Ms: 5_000,
};

type Graded = {
  item: SearchEvalCase;
  result: FindResult;
  latencyMs: number;
  costUsd: number;
  trace: FindTrace;
};

type Metrics = {
  junkRejection: number;
  falseRejection: number;
  precisionAtStrong: number;
  primaryRecallAt5: number;
  allRecallAt5: number;
  primaryShownAsStrong: number;
  broadStrongCases: number;
  notARequestMisses: number;
};

type SweepRow = {
  simFloor: number;
  metrics: Metrics;
  robustnessOk: boolean;
  current: boolean;
};

type Robustness = {
  total: number;
  passed: number;
  failures: string[];
};

const libraryIds = new Set(getAllEvals().map((pattern) => pattern.id));

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function labels(item: SearchEvalCase): { primary: string[]; related: string[]; all: string[] } {
  const primary = item.primary_ids ?? [];
  const related = item.related_ids ?? [];
  return { primary, related, all: [...primary, ...related] };
}

function isBroadAccept(item: SearchEvalCase): boolean {
  return item.expect === "accept" && (item.primary_ids?.length ?? 0) === 0;
}

function recall(expected: string[], returned: string[]): number {
  if (expected.length === 0) return 0;
  return expected.filter((id) => returned.includes(id)).length / expected.length;
}

function replay(graded: Graded[], simFloor: number): Metrics {
  let junk = 0;
  let junkRejected = 0;
  let good = 0;
  let goodRejected = 0;
  let strongHits = 0;
  let strongPredictions = 0;
  let primaryRecallSum = 0;
  let primaryCases = 0;
  let allRecallSum = 0;
  let allCases = 0;
  let primaryIds = 0;
  let primaryShownStrong = 0;
  let broadStrongCases = 0;
  let notARequestMisses = 0;

  for (const row of graded) {
    const decision = decideFind(row.trace, simFloor);
    const rejected = decision.status === "rejected";

    if (row.item.reason === "not_a_request" && !rejected) notARequestMisses += 1;

    if (row.item.expect === "reject") {
      junk += 1;
      if (rejected) junkRejected += 1;
    } else {
      good += 1;
      if (rejected) goodRejected += 1;
    }

    const returned = decision.status === "ok" ? decision.matches : [];
    const returnedIds = returned.map((match) => match.id);
    const { primary, all } = labels(row.item);

    if (primary.length > 0) {
      primaryCases += 1;
      primaryRecallSum += recall(primary, returnedIds);
      for (const id of primary) {
        primaryIds += 1;
        if (returned.some((match) => match.id === id && match.fit === "strong")) primaryShownStrong += 1;
      }
    }

    if (all.length > 0) {
      allCases += 1;
      allRecallSum += recall(all, returnedIds);
    }

    if (
      isBroadAccept(row.item) &&
      decision.status === "ok" &&
      decision.matches.some((match) => match.fit === "strong")
    ) {
      broadStrongCases += 1;
    }

    if (decision.status !== "ok") continue;

    for (const match of decision.matches) {
      if (match.fit !== "strong") continue;
      strongPredictions += 1;
      if (all.includes(match.id)) strongHits += 1;
    }
  }

  return {
    junkRejection: junk === 0 ? 0 : junkRejected / junk,
    falseRejection: good === 0 ? 0 : goodRejected / good,
    precisionAtStrong: strongPredictions === 0 ? 0 : strongHits / strongPredictions,
    primaryRecallAt5: primaryCases === 0 ? 0 : primaryRecallSum / primaryCases,
    allRecallAt5: allCases === 0 ? 0 : allRecallSum / allCases,
    primaryShownAsStrong: primaryIds === 0 ? 0 : primaryShownStrong / primaryIds,
    broadStrongCases,
    notARequestMisses,
  };
}

function meetsHard(metrics: Metrics, robustnessOk: boolean): boolean {
  return (
    metrics.junkRejection >= HARD_GATES.junkRejection &&
    metrics.notARequestMisses === 0 &&
    metrics.falseRejection <= HARD_GATES.falseRejection &&
    metrics.primaryRecallAt5 >= HARD_GATES.primaryRecallAt5 &&
    robustnessOk
  );
}

function penalty(metrics: Metrics, robustnessOk: boolean): number {
  return (
    Math.max(0, HARD_GATES.junkRejection - metrics.junkRejection) +
    Math.max(0, metrics.falseRejection - HARD_GATES.falseRejection) +
    Math.max(0, HARD_GATES.primaryRecallAt5 - metrics.primaryRecallAt5) +
    metrics.notARequestMisses +
    (robustnessOk ? 0 : 1)
  );
}

function labeledCases(graded: Graded[]): Graded[] {
  return graded.filter((row) => !row.item.base_query);
}

function robustnessOf(graded: Graded[], simFloor: number): Robustness {
  const byQuery = new Map(graded.map((row) => [row.item.query, row]));
  const failures: string[] = [];
  let total = 0;
  let passed = 0;

  for (const row of graded) {
    if (!row.item.base_query) continue;
    total += 1;
    const base = byQuery.get(row.item.base_query);
    const problems: string[] = [];

    if (!base) {
      problems.push("missing base query");
    } else {
      const baseDecision = decideFind(base.trace, simFloor);
      const variantDecision = decideFind(row.trace, simFloor);
      const baseOutcome = baseDecision.status === "ok" ? "accept" : "reject";
      const variantOutcome = variantDecision.status === "ok" ? "accept" : "reject";
      if (baseOutcome !== variantOutcome) problems.push(`outcome ${variantOutcome}, base ${baseOutcome}`);

      const returned = variantDecision.status === "ok" ? variantDecision.matches.map((match) => match.id) : [];
      const missing = (row.item.primary_ids ?? []).filter((id) => !returned.includes(id));
      if (missing.length > 0) problems.push(`primary not in top 5: ${missing.join(", ")}`);
    }

    if (problems.length === 0) passed += 1;
    else failures.push(`- ${row.item.query}: ${problems.join("; ")}`);
  }

  return { total, passed, failures };
}

function acceptMinTop1(graded: Graded[]): number | null {
  const scores = graded.flatMap((row) =>
    row.item.expect === "accept" && typeof row.trace.top1 === "number" ? [row.trace.top1] : [],
  );
  if (scores.length === 0) return null;
  return Math.min(...scores);
}

function roundDown2(value: number): number {
  return Math.floor(value * 100 + 1e-8) / 100;
}

function caseProblems(row: Graded, simFloor: number): string[] {
  const decision = decideFind(row.trace, simFloor);
  const problems: string[] = [];

  if (row.item.expect === "reject" && decision.status !== "rejected") {
    problems.push("expected reject, got accept");
  }
  if (row.item.expect === "accept" && decision.status === "rejected") {
    problems.push(`false reject (${decision.reason})`);
  }

  const returned = decision.status === "ok" ? decision.matches.map((match) => match.id) : [];
  const { primary, related, all } = labels(row.item);
  const missedPrimary = primary.filter((id) => !returned.includes(id));
  const missedRelated = related.filter((id) => !returned.includes(id));

  const weakPrimary =
    decision.status === "ok"
      ? primary.filter((id) => decision.matches.some((match) => match.id === id && match.fit !== "strong"))
      : [];

  if (missedPrimary.length > 0) problems.push(`missed primary ${missedPrimary.join(", ")}`);
  if (weakPrimary.length > 0) problems.push(`primary shown weak ${weakPrimary.join(", ")}`);
  if (missedRelated.length > 0) problems.push(`missed related ${missedRelated.join(", ")}`);

  if (decision.status === "ok") {
    const extraStrong = decision.matches
      .filter((match) => match.fit === "strong" && !all.includes(match.id))
      .map((match) => match.id);
    if (extraStrong.length > 0) problems.push(`extra strong ${extraStrong.join(", ")}`);
    if (isBroadAccept(row.item) && decision.matches.some((match) => match.fit === "strong")) {
      const strongIds = decision.matches.filter((match) => match.fit === "strong").map((match) => match.id);
      problems.push(`broad query returned strong ${strongIds.join(", ")}`);
    }
  }

  return problems;
}

function sweepGrid(graded: Graded[]): SweepRow[] {
  const labeled = labeledCases(graded);
  const observed = graded.flatMap((row) => (row.trace.top1 === null ? [] : [row.trace.top1]));
  const observedMax = observed.length > 0 ? Math.max(...observed) : 0.8;
  const simEnd = Math.min(0.98, Math.max(0.8, Math.ceil(observedMax * 50) / 50));
  const grid: SweepRow[] = [];

  for (let sim = 0.1; sim <= simEnd + 1e-9; sim += 0.02) {
    const simFloor = Number(sim.toFixed(2));
    const robustness = robustnessOf(graded, simFloor);
    grid.push({
      simFloor,
      metrics: replay(labeled, simFloor),
      robustnessOk: robustness.total > 0 && robustness.failures.length === 0,
      current: simFloor === Number(SIM_FLOOR.toFixed(2)),
    });
  }

  return grid;
}

function renderReport(input: {
  generatedAt: string;
  labeledCount: number;
  robustness: Robustness;
  acceptMinTop1: number | null;
  recommendedFloor: number | null;
  rejectRows: Array<{ top1: number | null; reason: string; query: string }>;
  metrics: Metrics;
  p50: number;
  p95: number;
  costUsd: number;
  qualityOk: boolean;
  latencyOk: boolean;
  robustnessOk: boolean;
  reasonMismatches: Array<{ query: string; expected: string; actual: string }>;
  failures: Array<{ query: string; problems: string[] }>;
  sweepNote: string;
  sweepRows: SweepRow[];
}): string {
  const hardMet = input.qualityOk && input.latencyOk && input.robustnessOk;
  const robustnessRate = input.robustness.total === 0 ? 0 : input.robustness.passed / input.robustness.total;
  const hardRows: Array<[string, string, string, boolean]> = [
    ["Junk rejection", input.metrics.junkRejection.toFixed(3), `≥ ${HARD_GATES.junkRejection}`, input.metrics.junkRejection >= HARD_GATES.junkRejection],
    ["Prompt-injection cases rejected", String(input.metrics.notARequestMisses), "0 missed", input.metrics.notARequestMisses === 0],
    ["False rejection", input.metrics.falseRejection.toFixed(3), `≤ ${HARD_GATES.falseRejection}`, input.metrics.falseRejection <= HARD_GATES.falseRejection],
    ["Primary recall@5", input.metrics.primaryRecallAt5.toFixed(3), `≥ ${HARD_GATES.primaryRecallAt5}`, input.metrics.primaryRecallAt5 >= HARD_GATES.primaryRecallAt5],
    ["Latency p95", `${Math.round(input.p95)} ms`, `≤ ${HARD_GATES.p95Ms} ms`, input.latencyOk],
    ["Robustness", robustnessRate.toFixed(3), "100%", input.robustnessOk],
  ];

  const lines = [
    "# Search eval",
    "",
    `SIM_FLOOR=${SIM_FLOOR.toFixed(2)}  labeled=${input.labeledCount}  robustness=${input.robustness.total}`,
    `Hard gates met: ${hardMet ? "yes" : "no"}`,
    "",
    `Accept-case min top1: ${input.acceptMinTop1 === null ? "none" : input.acceptMinTop1.toFixed(3)}`,
    `Recommended SIM_FLOOR (accept min − 0.10, round down): ${input.recommendedFloor === null ? "none" : input.recommendedFloor.toFixed(2)}`,
    "",
    `- Generated: ${input.generatedAt}`,
    `- Embedding model: ${models.embed}`,
    `- Latency p50: ${Math.round(input.p50)} ms`,
    `- Cost: $${input.costUsd.toFixed(4)}`,
    "",
    "## Hard gates",
    "",
    "Missing any of these fails the run.",
    "",
    "| Metric | Value | Target | Met |",
    "| --- | --- | --- | --- |",
    ...hardRows.map(([metric, value, target, met]) => `| ${metric} | ${value} | ${target} | ${met ? "yes" : "no"} |`),
    "",
    "## Report only",
    "",
    "Printed for context. These do not fail the run.",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Precision@strong | ${input.metrics.precisionAtStrong.toFixed(3)} |`,
    `| All-labels recall@5 | ${input.metrics.allRecallAt5.toFixed(3)} |`,
    `| Primary shown as strong | ${input.metrics.primaryShownAsStrong.toFixed(3)} |`,
    "",
  ];

  if (input.reasonMismatches.length > 0) {
    lines.push("## Reason mismatches", "");
    lines.push("Rejected, but not for the labeled reason. These do not fail the run.");
    lines.push("");
    for (const row of input.reasonMismatches) {
      lines.push(`- expected ${row.expected}, got ${row.actual}: ${row.query}`);
    }
    lines.push("");
  }

  lines.push("## Failing cases", "");
  if (input.failures.length === 0) {
    lines.push("(none)", "");
  } else {
    for (const failure of input.failures) {
      lines.push(`- ${failure.query}`);
      lines.push(`  ${failure.problems.join("; ")}`);
    }
    lines.push("");
  }

  if (input.robustness.failures.length > 0) {
    lines.push("## Robustness failures", "");
    lines.push(...input.robustness.failures);
    lines.push("");
  }

  const scoredRejects = input.rejectRows.flatMap((row) => (row.top1 === null ? [] : [row.top1]));
  const sortedRejects = [...scoredRejects].sort((left, right) => left - right);
  const rejectMedian = sortedRejects.length === 0 ? null : sortedRejects[Math.floor(sortedRejects.length / 2)];
  const prefilterRejects = input.rejectRows.filter((row) => row.top1 === null).length;

  lines.push("## Reject-case top1 distribution", "");
  lines.push(
    scoredRejects.length === 0
      ? "No scored reject cases."
      : `n=${sortedRejects.length}  min=${sortedRejects[0].toFixed(3)}  median=${rejectMedian?.toFixed(3)}  max=${sortedRejects[sortedRejects.length - 1].toFixed(3)}  prefilter=${prefilterRejects}`,
  );
  lines.push("");
  lines.push("| top1 | reason | query |");
  lines.push("| --- | --- | --- |");
  for (const row of input.rejectRows) {
    lines.push(`| ${row.top1 === null ? "—" : row.top1.toFixed(3)} | ${row.reason} | ${row.query} |`);
  }
  lines.push("");

  lines.push("## Threshold sweep", "");
  lines.push("Cached embeddings and judgments only. No extra model calls.");
  lines.push("");
  lines.push(input.sweepNote);
  lines.push("");
  lines.push("| sim | junk | injectMiss | false | primary | meets |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const row of input.sweepRows) {
    const mark = row.current ? " current" : "";
    const pass = meetsHard(row.metrics, row.robustnessOk) ? "yes" : "no";
    lines.push(
      `| ${row.simFloor.toFixed(2)} | ${row.metrics.junkRejection.toFixed(3)} | ${row.metrics.notARequestMisses} | ${row.metrics.falseRejection.toFixed(3)} | ${row.metrics.primaryRecallAt5.toFixed(3)} | ${pass}${mark} |`,
    );
  }
  lines.push("");

  if (!hardMet) {
    lines.push("Hard gates missed. SIM_FLOOR was not changed.", "");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const cases = await loadSearchEvals();
  const unknownIds = cases
    .flatMap((item) => [...(item.primary_ids ?? []), ...(item.related_ids ?? [])])
    .filter((id) => !libraryIds.has(id));

  if (unknownIds.length > 0) {
    throw new Error(`search-evals.json cites unknown pattern ids: ${[...new Set(unknownIds)].join(", ")}`);
  }

  enableFindTraces();
  const graded: Graded[] = [];

  for (const [index, item] of cases.entries()) {
    process.stderr.write(`\r[eval:search] ${index + 1}/${cases.length}`);
    const result = await findEvals(item.query);
    const recorded = drainFindTraces();
    const trace = recorded[0];

    if (recorded.length !== 1 || !trace) {
      throw new Error(`findEvals did not record a trace for case ${index + 1}.`);
    }

    const replayed = decideFind(trace, SIM_FLOOR);
    const sameStatus = result.status === replayed.status;
    const sameReason =
      result.status === "rejected" && replayed.status === "rejected" ? result.reason === replayed.reason : true;
    const sameMatches =
      result.status === "ok" && replayed.status === "ok"
        ? result.matches.length === replayed.matches.length &&
          result.matches.every(
            (match, matchIndex) =>
              match.id === replayed.matches[matchIndex]?.id && match.fit === replayed.matches[matchIndex]?.fit,
          )
        : result.status !== "ok";

    if (!sameStatus || !sameReason || !sameMatches) {
      throw new Error(`Threshold replay diverged from findEvals on case ${index + 1}.`);
    }

    graded.push({ item, result, latencyMs: trace.latencyMs, costUsd: trace.costUsd, trace });
  }

  process.stderr.write("\n");

  const generatedAt = new Date().toISOString();
  const labeled = labeledCases(graded);
  const metrics = replay(labeled, SIM_FLOOR);
  const latencies = graded.map((row) => row.latencyMs);
  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const costUsd = graded.reduce((sum, row) => sum + row.costUsd, 0);
  const robustness = robustnessOf(graded, SIM_FLOOR);
  const robustnessOk = robustness.total > 0 && robustness.failures.length === 0;
  const minTop1 = acceptMinTop1(graded);
  const recommendedFloor = minTop1 === null ? null : roundDown2(minTop1 - 0.1);
  const reasonMismatches = labeled.flatMap((row) => {
    if (!row.item.reason || row.result.status !== "rejected" || row.result.reason === row.item.reason) return [];
    return [{ query: row.item.query, expected: row.item.reason, actual: row.result.reason }];
  });
  const failures = labeled.flatMap((row) => {
    const problems = caseProblems(row, SIM_FLOOR);
    return problems.length > 0 ? [{ query: row.item.query, problems }] : [];
  });
  const rejectRows = labeled
    .filter((row) => row.item.expect === "reject")
    .map((row) => ({ top1: row.trace.top1, reason: row.item.reason ?? "", query: row.item.query }))
    .sort((left, right) => (left.top1 ?? -1) - (right.top1 ?? -1));

  const grid = sweepGrid(graded);
  const meeting = grid.filter((row) => meetsHard(row.metrics, row.robustnessOk));
  const shown =
    meeting.length > 0
      ? meeting
      : [...grid].sort((left, right) => penalty(left.metrics, left.robustnessOk) - penalty(right.metrics, right.robustnessOk)).slice(0, 8);
  if (!shown.some((row) => row.current)) {
    const current = grid.find((row) => row.current);
    if (current) shown.push(current);
  }
  shown.sort((left, right) => left.simFloor - right.simFloor);

  const qualityOk = meetsHard(metrics, true);
  const latencyOk = p95 <= HARD_GATES.p95Ms;
  const floorOk = recommendedFloor !== null && Number(SIM_FLOOR.toFixed(2)) === recommendedFloor;
  const report = renderReport({
    generatedAt,
    labeledCount: labeled.length,
    robustness,
    acceptMinTop1: minTop1,
    recommendedFloor,
    rejectRows,
    metrics,
    p50,
    p95,
    costUsd,
    qualityOk,
    latencyOk,
    robustnessOk,
    reasonMismatches,
    failures,
    sweepNote:
      meeting.length > 0
        ? `Rows that meet the hard gates: ${meeting.length}`
        : "No row meets the hard gates. Closest 8:",
    sweepRows: shown,
  });

  await writeFile(path.join(process.cwd(), "data", "search-eval-report.md"), report);
  console.log(report);

  if (!floorOk) {
    console.error(
      `SIM_FLOOR ${SIM_FLOOR} does not match accept-case min top1 ${minTop1 ?? "none"} minus 0.10, rounded down (${recommendedFloor ?? "none"}).`,
    );
  }

  if (!qualityOk || !latencyOk || !robustnessOk || !floorOk) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
