import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { clientIp, limit } from "@/lib/auth-guard";
import { bestPlanForUser, planName, requiredPlanFor } from "@/lib/billing/api-gate";
import { PLAN_RANK } from "@/lib/billing/access";

/**
 * Site-wide rate limit for every API route, counted per IP in Postgres
 * (so it holds across all Vercel instances). Auth routes also have their own stricter limits.
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

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (SKIP.some((r) => r.test(path))) return NextResponse.next();

  const rule = RULES.find((r) => r.test(path, req.method))!;
  const ip = clientIp(req.headers);
  const ok = await limit(`api:${rule.name}:${ip}`, rule.max, rule.windowMs);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down and try again in a minute." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rule.windowMs / 1000)) } },
    );
  }

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
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
