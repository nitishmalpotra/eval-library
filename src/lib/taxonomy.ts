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

export type FeatureType = (typeof featureTypes)[number];
export type Category = (typeof categories)[number];
export type Difficulty = (typeof difficulties)[number];
