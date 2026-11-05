// In-memory fixed-window limiter. Per server instance: enough for one Node server; on serverless use Upstash/Redis.
const buckets = new Map<string, { n: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size > 10000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (b === undefined || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n += 1;
  return b.n <= limit;
}

export function ipFrom(value: unknown): string {
  return String(value ?? "local").split(",")[0].trim() || "local";
}
