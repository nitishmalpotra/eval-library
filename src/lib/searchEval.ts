import { readFileSync } from "node:fs";
import path from "node:path";

export type SearchEvalHeadline = {
  generated: string;
  embeddingModel: string;
  latencyP50: string;
  cost: string;
  gates: { metric: string; value: string; target: string }[];
  report: { metric: string; value: string }[];
};

export function getSearchEvalHeadline(): SearchEvalHeadline {
  const text = readFileSync(path.join(process.cwd(), "data/search-eval-report.md"), "utf8");

  return {
    generated: bullet(text, "Generated"),
    embeddingModel: bullet(text, "Embedding model"),
    latencyP50: bullet(text, "Latency p50"),
    cost: bullet(text, "Cost"),
    gates: sectionRows(text, "## Hard gates").map((cells) => ({
      metric: cells[0] ?? "",
      value: cells[1] ?? "",
      target: cells[2] ?? "",
    })),
    report: sectionRows(text, "## Report only").map((cells) => ({
      metric: cells[0] ?? "",
      value: cells[1] ?? "",
    })),
  };
}

function bullet(text: string, label: string) {
  const prefix = `- ${label}: `;
  const line = text.split("\n").find((item) => item.startsWith(prefix));
  return line ? line.slice(prefix.length).trim() : "";
}

function sectionRows(text: string, heading: string) {
  const start = text.indexOf(heading);
  if (start < 0) return [];
  const next = text.indexOf("\n## ", start + heading.length);
  const block = text.slice(start, next === -1 ? undefined : next);

  return block
    .split("\n")
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells[0] && cells[0] !== "Metric");
}
