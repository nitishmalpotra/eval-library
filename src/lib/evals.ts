import { z } from "zod";
import evalsJson from "../../data/evals.json";

export const featureTypes = [
  "chatbot",
  "agent",
  "rag",
  "classification",
  "summarization",
  "code_generation",
  "search_ranking",
  "multimodal",
  "general",
] as const;

export const categories = ["methodology", "metric", "process", "framework"] as const;
export const difficulties = ["beginner", "intermediate", "advanced"] as const;

const sourceSchema = z.object({
  file: z.string(),
  title: z.string(),
  date: z.string(),
  operator: z.string(),
  url: z.string().url().optional(),
  excerpt: z.string(),
});

const evalPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  one_liner: z.string(),
  category: z.enum(categories),
  feature_types: z.array(z.enum(featureTypes)),
  difficulty: z.enum(difficulties),
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
  source_url: z.string().url().optional(),
  source_excerpt: z.string(),
  sources: z.array(sourceSchema).optional(),
  codex_prompt_template: z.string(),
  keywords: z.array(z.string()),
  curation_status: z.enum(["auto", "verified", "edited"]),
});

const evalPatternsSchema = z.array(evalPatternSchema);
const evals = evalPatternsSchema.parse(evalsJson);

export type EvalPattern = z.infer<typeof evalPatternSchema>;
export type FindMatch = {
  id: string;
  rationale: string;
  score: number;
  pattern: EvalPattern;
};
export type FeatureType = (typeof featureTypes)[number];
export type Category = (typeof categories)[number];
export type Difficulty = (typeof difficulties)[number];

export function getAllEvals() {
  return evals;
}

export function getEvalById(id: string) {
  return evals.find((pattern) => pattern.id === id);
}
