import OpenAI from "openai";

/**
 * Shared OpenRouter client for the /find route and the data scripts.
 * OpenRouter speaks the OpenAI API, so this stays on the `openai` SDK.
 * Do not import this from client components.
 */
export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  timeout: 20_000,
  maxRetries: 1,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-OpenRouter-Title": "AI Eval Field Guide",
  },
});

export const models = {
  triage: process.env.OPENROUTER_MODEL_TRIAGE ?? "anthropic/claude-haiku-5.5",
  pipeline: process.env.OPENROUTER_MODEL_PIPELINE ?? "anthropic/claude-sonnet-5.5",
  cluster: process.env.OPENROUTER_MODEL_CLUSTER ?? "anthropic/claude-opus-5.5",
  runtime: process.env.OPENROUTER_MODEL_RUNTIME ?? "anthropic/claude-haiku-5.5",
  embed: process.env.OPENROUTER_MODEL_EMBED ?? "openai/text-embedding-3-small",
};

/** Pipeline scripts override the 20s client timeout. Extraction can take minutes. */
export const pipelineTimeoutMs = 300_000;

/**
 * Runtime judge only. OpenRouter's reasoning parameter
 * (https://openrouter.ai/docs/guides/best-practices/reasoning-tokens):
 * `effort: "none"` disables reasoning so the judge stays on the latency budget.
 * Pipeline calls leave reasoning at the model default and use a large max_tokens.
 */
export const runtimeReasoning = { effort: "none" } as const;

/** OpenRouter includes `usage.cost` (USD) on every response. The SDK types omit it. */
export function usageCostUsd(usage: unknown): number {
  if (!usage || typeof usage !== "object" || !("cost" in usage)) {
    throw new Error("OpenRouter response is missing usage.cost.");
  }

  const cost = usage.cost;

  if (typeof cost !== "number" || !Number.isFinite(cost)) {
    throw new Error("OpenRouter response usage.cost is not a number.");
  }

  return cost;
}
