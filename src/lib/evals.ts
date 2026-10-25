import { z } from "zod";
import evalsJson from "../../data/evals.json";
import { categories, difficulties, featureTypes } from "./taxonomy";

export { categories, difficulties, featureTypes };
export type { Category, Difficulty, FeatureType } from "./taxonomy";

const sourceSchema = z.object({
  file: z.string(),
  title: z.string(),
  date: z.string(),
  operator: z.string(),
  publication: z.string().default(""),
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
  source_publication: z.string().default(""),
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
const specimenById = new Map(
  evals.map((pattern) => pattern.id).sort((left, right) => left.localeCompare(right)).map((id, index) => [id, index + 1]),
);

export type EvalPattern = z.infer<typeof evalPatternSchema>;
export type CardFields = Pick<
  EvalPattern,
  | "id"
  | "name"
  | "one_liner"
  | "category"
  | "difficulty"
  | "feature_types"
  | "source_operator"
  | "source_publication"
  | "source_date"
>;

export function getAllEvals() {
  return evals;
}

export function getSpecimenNumber(id: string) {
  return specimenById.get(id) ?? 0;
}

export function getEvalById(id: string) {
  return evals.find((pattern) => pattern.id === id);
}
