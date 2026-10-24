const DAY_MS = 24 * 60 * 60 * 1000;

export type QuotaSnapshot = {
  limited: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function findDailyLimit(): number {
  const raw = process.env.FIND_DAILY_LIMIT;

  if (raw === undefined || raw.trim() === "") return 10;

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("FIND_DAILY_LIMIT must be a positive integer.");
  }

  return value;
}

export function createFindQuota(options?: { limit?: number; now?: () => number; windowMs?: number }) {
  const limit = options?.limit ?? findDailyLimit();
  const now = options?.now ?? Date.now;
  const windowMs = options?.windowMs ?? DAY_MS;
  const buckets = new Map<string, Bucket>();

  function currentBucket(ip: string): Bucket {
    const time = now();
    const existing = buckets.get(ip);

    if (!existing || time >= existing.resetAt) {
      const fresh = { count: 0, resetAt: time + windowMs };
      buckets.set(ip, fresh);
      return fresh;
    }

    return existing;
  }

  return {
    snapshot(ip: string): QuotaSnapshot {
      const bucket = currentBucket(ip);
      return {
        limited: bucket.count >= limit,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt,
      };
    },
    consume(ip: string): QuotaSnapshot {
      const bucket = currentBucket(ip);

      if (bucket.count >= limit) {
        return { limited: true, remaining: 0, resetAt: bucket.resetAt };
      }

      bucket.count += 1;
      return { limited: false, remaining: limit - bucket.count, resetAt: bucket.resetAt };
    },
  };
}

// ponytail: per-instance memory, resets on cold start; OpenRouter key credit limit is the hard backstop. Upgrade to Upstash/Vercel KV if abuse appears.
export const findQuota = createFindQuota();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}
