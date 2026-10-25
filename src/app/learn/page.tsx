import type { Metadata } from "next";
import { LearnClient } from "./LearnClient";
import { getAllEvals, getEvalById, getSpecimenNumber } from "@/lib/evals";

export const metadata: Metadata = {
  title: "Learn",
  openGraph: {
    images: ["/opengraph-image"],
  },
};

export default function LearnPage() {
  const patterns = getAllEvals();
  const beginnerPattern =
    [...patterns].filter((pattern) => pattern.difficulty === "beginner").sort((a, b) => a.id.localeCompare(b.id))[0] ??
    patterns[0];
  const categoryExamples = ["methodology", "metric", "process", "framework"].map(
    (category) => [...patterns].filter((pattern) => pattern.category === category).sort((a, b) => a.id.localeCompare(b.id))[0],
  );
  const workedExample = getEvalById("evals-as-the-new-prd") ?? getEvalById("llm-as-a-judge") ?? patterns[0];
  const tourPattern = getEvalById("eval-lifecycle") ?? patterns.find((pattern) => pattern.feature_types.includes("agent")) ?? patterns[0];

  const specimenById = Object.fromEntries(patterns.map((pattern) => [pattern.id, getSpecimenNumber(pattern.id)]));

  return (
    <LearnClient
      beginnerPattern={beginnerPattern}
      categoryExamples={categoryExamples}
      workedExample={workedExample}
      tourPattern={tourPattern}
      specimenById={specimenById}
    />
  );
}
