import { FindCreditsError, FindModelError, findEvals, hasCachedFind } from "@/lib/find";
import { clientIp, findQuota } from "@/lib/findQuota";
import { isObviousGibberish, normalizeQuery } from "@/lib/queryQuality";

const TEST_CREDITS_QUERY = "TEST_CREDITS_EXHAUSTED";

function logRequest(entry: {
  decision: string;
  reason: string | null;
  queryLength: number;
  latencyMs: number;
}) {
  console.log(
    JSON.stringify({
      decision: entry.decision,
      reason: entry.reason,
      top1: null,
      nStrong: 0,
      nWeak: 0,
      latencyMs: Math.round(entry.latencyMs),
      costUsd: 0,
      cached: false,
      queryLength: entry.queryLength,
    }),
  );
}

function withRemaining<T extends object>(body: T, remaining: number, status = 200) {
  return Response.json({ ...body, remaining }, { status });
}

export async function POST(request: Request) {
  const started = performance.now();
  let rawQuery = "";

  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      logRequest({ decision: "invalid", reason: null, queryLength: 0, latencyMs: performance.now() - started });
      return withRemaining({ error: "Invalid request body" }, findQuota.snapshot(clientIp(request)).remaining, 400);
    }

    const query = body && typeof body === "object" && "query" in body ? body.query : undefined;
    rawQuery = typeof query === "string" ? query : "";
    const ip = clientIp(request);

    if (process.env.NODE_ENV !== "production" && query === TEST_CREDITS_QUERY) {
      const snapshot = findQuota.snapshot(ip);
      logRequest({
        decision: "credits_exhausted",
        reason: null,
        queryLength: normalizeQuery(TEST_CREDITS_QUERY).length,
        latencyMs: performance.now() - started,
      });
      return withRemaining({ status: "credits_exhausted" }, snapshot.remaining);
    }

    if (typeof query !== "string") {
      logRequest({ decision: "invalid", reason: null, queryLength: 0, latencyMs: performance.now() - started });
      return withRemaining({ error: "Query must be a string" }, findQuota.snapshot(ip).remaining, 400);
    }

    const trimmed = query.trim();

    if (!trimmed) {
      logRequest({ decision: "invalid", reason: null, queryLength: 0, latencyMs: performance.now() - started });
      return withRemaining({ error: "Query must not be empty" }, findQuota.snapshot(ip).remaining, 400);
    }

    if (trimmed.length > 1000) {
      logRequest({
        decision: "invalid",
        reason: null,
        queryLength: trimmed.length,
        latencyMs: performance.now() - started,
      });
      return withRemaining({ error: "Query must be at most 1000 characters" }, findQuota.snapshot(ip).remaining, 400);
    }

    const normalized = normalizeQuery(query);
    const snapshot = findQuota.snapshot(ip);

    if (hasCachedFind(normalized) || isObviousGibberish(normalized)) {
      const result = await findEvals(normalized);
      return withRemaining(result, snapshot.remaining);
    }

    const consumed = findQuota.consume(ip);

    if (consumed.limited) {
      logRequest({
        decision: "limited",
        reason: null,
        queryLength: normalized.length,
        latencyMs: performance.now() - started,
      });
      return withRemaining(
        { status: "limited", resetAt: new Date(consumed.resetAt).toISOString() },
        0,
        429,
      );
    }

    const result = await findEvals(normalized);
    return withRemaining(result, consumed.remaining);
  } catch (error) {
    const ip = clientIp(request);
    const remaining = findQuota.snapshot(ip).remaining;

    if (error instanceof FindCreditsError) {
      return withRemaining({ status: "credits_exhausted" }, remaining);
    }

    if (error instanceof FindModelError) {
      return withRemaining({ error: error.message }, remaining, 502);
    }

    console.error(error);
    logRequest({
      decision: "error",
      reason: null,
      queryLength: normalizeQuery(rawQuery).length,
      latencyMs: performance.now() - started,
    });
    return withRemaining({ error: "Something went wrong" }, remaining, 500);
  }
}
