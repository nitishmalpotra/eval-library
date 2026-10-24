import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { getOpenRouter, pipelineTimeoutMs, usageCostUsd } from "../../src/lib/openrouter";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatJsonOptions = {
  model: string;
  messages: ChatMessage[];
  max_tokens: number;
  name?: string;
  timeout?: number;
};

export type ChatJsonResult<T> = {
  data: T;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
};

const spendPath = path.join(process.cwd(), "data", "extracted", ".spend.json");

let spendChain: Promise<unknown> = Promise.resolve();

export class BudgetExceededError extends Error {
  constructor(spent: number, budget: number) {
    super(
      `Pipeline spend $${spent.toFixed(4)} has reached the $${budget} budget. Stopping before the next model call.`,
    );
    this.name = "BudgetExceededError";
  }
}

export class ResponseInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResponseInvalidError";
  }
}

export function budgetUsd(): number {
  const raw = process.env.PIPELINE_BUDGET_USD;
  const value = raw === undefined || raw.trim() === "" ? 35 : Number(raw);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("PIPELINE_BUDGET_USD must be a positive number.");
  }

  return value;
}

export async function spentUsd(): Promise<number> {
  return readSpend();
}

export async function assertBudget(): Promise<void> {
  const spent = await readSpend();
  const budget = budgetUsd();

  if (spent >= budget) {
    throw new BudgetExceededError(spent, budget);
  }
}

export async function recordSpend(costUsd: number): Promise<number> {
  return locked(async () => {
    const next = (await readSpend()) + costUsd;
    await mkdir(path.dirname(spendPath), { recursive: true });
    await writeFile(
      spendPath,
      `${JSON.stringify({ usd: next, updated_at: new Date().toISOString() }, null, 2)}\n`,
    );
    return next;
  });
}

export async function chatJson<T>(
  schema: z.ZodType<T>,
  options: ChatJsonOptions,
): Promise<ChatJsonResult<T>> {
  const messages = [...options.messages];
  let costUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let lastError = "The model returned an empty response.";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await assertBudget();

    const response = await createChat(options, messages, jsonSchema(schema));

    if (!("choices" in response)) {
      throw new Error("Expected a non-streaming chat completion.");
    }

    const cost = usageCostUsd(response.usage);
    costUsd += cost;
    inputTokens += response.usage?.prompt_tokens ?? 0;
    outputTokens += response.usage?.completion_tokens ?? 0;
    await recordSpend(cost);

    const content = response.choices[0]?.message.content;

    try {
      if (!content) {
        const finish = response.choices[0]?.finish_reason;
        throw new Error(`The model returned an empty response (finish_reason=${finish}).`);
      }

      return {
        data: schema.parse(JSON.parse(content)),
        costUsd,
        inputTokens,
        outputTokens,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt === 2) {
        throw new ResponseInvalidError(lastError);
      }

      messages.push({
        role: "user",
        content: `The previous response failed validation: ${lastError}\nReturn corrected JSON only.`,
      });
    }
  }

  throw new ResponseInvalidError(lastError);
}

async function createChat(
  options: ChatJsonOptions,
  messages: ChatMessage[],
  schema: Record<string, unknown>,
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      return await getOpenRouter().chat.completions.create(
        {
          model: options.model,
          messages,
          max_tokens: options.max_tokens,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.name ?? "response",
              strict: true,
              schema,
            },
          },
          provider: { require_parameters: true },
        } as Parameters<ReturnType<typeof getOpenRouter>["chat"]["completions"]["create"]>[0],
        { timeout: options.timeout ?? pipelineTimeoutMs },
      );
    } catch (error: unknown) {
      lastError = error;

      if (!isRateLimit(error) || attempt === 6) {
        throw error;
      }

      const waitMs = 20_000 * attempt;
      console.warn(
        `Rate limited on ${options.model}. Waiting ${waitMs / 1000}s before retry ${attempt}.`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError;
}

function isRateLimit(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = "status" in error ? Number(error.status) : 0;
  const message = error instanceof Error ? error.message : "";
  return status === 429 || message.toLowerCase().includes("rate limit");
}

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const generated = z.toJSONSchema(schema) as Record<string, unknown>;
  delete generated.$schema;
  return tighten(generated) as Record<string, unknown>;
}

function tighten(node: unknown): unknown {
  if (!node || typeof node !== "object") {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => tighten(item));
  }

  const record = node as Record<string, unknown>;

  if (Array.isArray(record.anyOf) && record.anyOf.every(isConstSchema)) {
    const values = record.anyOf.map((item) => item.const);
    const kind = typeof values[0];

    if (values.every((value) => typeof value === kind)) {
      return {
        type: kind === "number" ? "integer" : "string",
        enum: values,
      };
    }
  }

  const tightened: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    tightened[key] = tighten(value);
  }

  return tightened;
}

function isConstSchema(value: unknown): value is { const: string | number } {
  if (!value || typeof value !== "object" || !("const" in value)) {
    return false;
  }

  const constant = value.const;
  return typeof constant === "string" || typeof constant === "number";
}

async function readSpend(): Promise<number> {
  try {
    const parsed = JSON.parse(await readFile(spendPath, "utf8")) as { usd?: unknown };
    return typeof parsed.usd === "number" && Number.isFinite(parsed.usd) ? parsed.usd : 0;
  } catch {
    return 0;
  }
}

function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = spendChain.then(fn, fn);
  spendChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
