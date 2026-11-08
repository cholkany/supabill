import type { MiddlewareHandler } from "hono";

// shortcut: per-process, client-IP (X-Forwarded-For) buckets. Move to Redis if
// the API runs as more than one instance or the public endpoints see real abuse.
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

export function rateLimit(options: { windowMs: number; max: number }): MiddlewareHandler {
  return async (c, next) => {
    const forwarded = c.req.header("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
    const now = Date.now();

    let bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(ip, bucket);
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ message: "Too many requests." }, 429);
    }

    await next();
  };
}
