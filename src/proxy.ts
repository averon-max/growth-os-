import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { clientIp, limit } from "@/lib/auth-guard";
import { burst } from "@/lib/burst";
import { bestPlanForUser, isTrialing, planName, requiredPlanFor } from "@/lib/billing/api-gate";
import { TRIAL_DAYS, trialPaidRequests } from "@/lib/billing/trial";
import { PLAN_RANK } from "@/lib/billing/access";

/**
 * Flood protection, in layers (Vercel's own firewall sits in front of all of this):
 *  1. Memory counter per address: turns away bursts for free, before any database work.
 *  2. Request size cap: huge bodies are refused before they are read.
 *  3. Postgres counters for writes, billing and paid work, shared by every server instance.
 *     Reads are only counted in memory, so a flood of reads cannot load the database.
 *  4. Plan, trial and per-account limits on everything that costs money (DataForSEO, OpenAI).
 * Auth routes also have their own stricter limits.
 */
const RULES: { test: (path: string, method: string) => boolean; name: string; max: number; windowMs: number }[] = [
  // Expensive AI / crawling / paid-API work
  { name: "heavy", test: (p, m) => m !== "GET" && /\/(content|write|writer|generate|ai|crawl|audit|keywords|research|backlinks|competitors)/.test(p), max: 20, windowMs: 10 * 60 * 1000 },
  // Billing & admin actions
  { name: "billing", test: (p) => p.startsWith("/api/billing") || p.startsWith("/api/admin"), max: 30, windowMs: 10 * 60 * 1000 },
  // Any other write
  { name: "write", test: (_p, m) => m !== "GET" && m !== "HEAD" && m !== "OPTIONS", max: 60, windowMs: 60 * 1000 },
  // Reads
  { name: "read", test: () => true, max: 300, windowMs: 60 * 1000 },
];

// Stripe calls us from its own servers and signs every request; NextAuth's session polling is cheap and frequent.
const SKIP = [/^\/api\/webhooks\/stripe/, /^\/api\/auth\/(session|csrf|providers)$/];

const tooMany = (seconds: number, json = true) =>
  json
    ? NextResponse.json({ error: "Too many requests. Slow down and try again in a minute." }, { status: 429, headers: { "Retry-After": String(seconds) } })
    : new NextResponse("Too many requests. Try again in a minute.", { status: 429, headers: { "Retry-After": String(seconds), "Content-Type": "text/plain" } });

const MB = 1024 * 1024;

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = clientIp(req.headers);

  // Dashboard pages: memory check only (page loads and link prefetches are frequent and free).
  if (!path.startsWith("/api/")) {
    return burst(`page:${ip}`, 600, 60_000) ? NextResponse.next() : tooMany(60, false);
  }

  if (/^\/api\/webhooks\/stripe/.test(path)) return NextResponse.next(); // signed by Stripe, checked in the route

  const size = Number(req.headers.get("content-length") ?? 0);
  if (size > (path.startsWith("/api/images") ? 26 * MB : 1 * MB)) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  if (!burst(`api:${ip}`, 80, 10_000)) return tooMany(10);
  if (SKIP.some((r) => r.test(path))) return NextResponse.next();

  const rule = RULES.find((r) => r.test(path, req.method))!;
  const ok = rule.name === "read" ? burst(`read:${ip}`, rule.max, rule.windowMs) : await limit(`api:${rule.name}:${ip}`, rule.max, rule.windowMs);
  if (!ok) return tooMany(Math.ceil(rule.windowMs / 1000));

  // Paid features: the API needs the same plan as the page. Not signed in → the route itself answers 401.
  const required = requiredPlanFor(path);
  if (required) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = typeof token?.userId === "string" ? token.userId : null;
    if (userId) {
      const plan = await bestPlanForUser(userId);
      if (PLAN_RANK[plan] < PLAN_RANK[required]) {
        return NextResponse.json(
          { error: `This needs the ${planName(required)} plan.`, requiredPlan: required, upgrade: "/pricing" },
          { status: 402 },
        );
      }
      // AI writer: a few drafts at a time per account, whatever address they come from
      // (the monthly allowance itself is checked in the writer route).
      if (req.method === "POST" && /^\/api\/writer(\/|$)/.test(path) && !(await limit(`writer-user:${userId}`, 6, 10 * 60 * 1000))) {
        return tooMany(600);
      }
      // Free trial: a fixed number of paid-feature requests for the whole trial, so a trial costs about $1–1.50.
      // Only requests that can buy new data count: writes, refreshes and live research. Opening pages with saved data is free.
      const costly = req.method !== "GET" || /explore|serp|research|live|refresh=1|fresh=1/.test(path + req.nextUrl.search);
      if (costly && (await isTrialing(userId))) {
        const heavy = /^\/api\/(backlinks|competitors)(\/|$)/.test(path);
        const allowed = (await limit(`trial:${userId}`, trialPaidRequests(), TRIAL_DAYS * 24 * 60 * 60 * 1000))
          && (!heavy || (await limit(`trial-heavy:${userId}`, 10, TRIAL_DAYS * 24 * 60 * 60 * 1000)));
        if (!allowed) {
          return NextResponse.json(
            { error: "You've used the data included in the free trial. Start your plan now to keep going.", trialLimit: true, upgrade: "/dashboard/settings/billing" },
            { status: 402 },
          );
        }
      }
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*", "/dashboard/:path*"] };
