import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLAN_ID, planFor, type Plan } from "./plans";

/*
 * Each workspace's daily and monthly allowance of paid data (PlanLimits.dataPerDayUsd / dataPerMonthUsd).
 *
 * The fetch interceptor in instrumentation.ts asks who() just before a paid DataForSEO call:
 *   1. code run inside withSpender() names the workspace itself (background jobs, the AI writer);
 *   2. otherwise the signed-in user of the current request is used, with their best-plan workspace.
 * Admins are not limited (the service-wide cap still applies). Calls with nobody behind them only meet the
 * service-wide cap.
 *
 * Spending is stored in micro-dollars in the same counter table as the monthly article allowance, so no new
 * table is needed. Not "server-only": instrumentation.ts imports it.
 */

type Spender = { workspaceId?: string; content?: boolean };
type G = typeof globalThis & { __spender?: AsyncLocalStorage<Spender> };

function store(): AsyncLocalStorage<Spender> {
  const g = globalThis as G;
  g.__spender ??= new AsyncLocalStorage<Spender>();
  return g.__spender;
}

/** Paid calls inside fn are charged to this workspace. */
export function withSpender<T>(workspaceId: string | null, fn: () => Promise<T>): Promise<T> {
  return store().run({ ...store().getStore(), ...(workspaceId ? { workspaceId } : {}) }, fn);
}

/**
 * Paid data an AI article needs (Google results, competitor pages). It is counted for the workspace but never
 * stopped halfway by the daily allowance: articles have their own monthly allowance, and a draft cut off in the
 * middle would waste the AI money already spent on it.
 */
export function asContent<T>(fn: () => Promise<T>): Promise<T> {
  return store().run({ ...store().getStore(), content: true }, fn);
}

export type Who = { workspaceId: string; plan: Plan; admin: boolean; content: boolean };

const TTL = 60_000;
const memo = new Map<string, { at: number; value: unknown }>();
async function remember<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  const value = await load();
  memo.set(key, { at: Date.now(), value });
  if (memo.size > 2000) memo.clear();
  return value;
}

const ACTIVE = new Set(["active", "trialing", "past_due"]);
const RANK = { FREE: 0, STARTER: 1, GROWTH: 2, AUTOPILOT: 3 } as const;

/** Same rules as getWorkspaceBilling(), without its "server-only" import. */
export function planOfWorkspace(workspaceId: string): Promise<Plan> {
  return remember(`plan:${workspaceId}`, async () => {
    const sub = await prisma.subscription.findUnique({ where: { workspaceId }, select: { plan: true, status: true, source: true, currentPeriodEnd: true } });
    const expired = sub?.source === "manual" && sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() < Date.now();
    return !sub || expired || !ACTIVE.has(sub.status) ? planFor(DEFAULT_PLAN_ID) : planFor(sub.plan);
  });
}

async function adminUser(userId: string): Promise<boolean> {
  return remember(`admin:${userId}`, async () => {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true, email: true } });
    const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    return Boolean(u?.isAdmin) || (u?.email ? list.includes(u.email.toLowerCase()) : false);
  });
}

/** The user's workspace with the best plan (the same one that decides which pages they can open). */
async function workspaceOfUser(userId: string): Promise<string | null> {
  return remember(`ws:${userId}`, async () => {
    const rows = await prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true }, orderBy: { createdAt: "asc" } });
    let best: { id: string; rank: number } | null = null;
    for (const r of rows) {
      const rank = RANK[(await planOfWorkspace(r.workspaceId)).id];
      if (best === null || rank > best.rank) best = { id: r.workspaceId, rank };
    }
    return best?.id ?? null;
  });
}

/*
 * The signed-in user is read by a function the app registers (src/lib/session.ts): the request's cookies live in
 * the app's own module instances, which code loaded by instrumentation.ts can't reach directly.
 */
type UserResolver = () => Promise<string | null>;
const RESOLVER = "__hxSignedInUser";

export function registerUserResolver(fn: UserResolver): void {
  (globalThis as Record<string, unknown>)[RESOLVER] = fn;
}

async function signedInUserId(): Promise<string | null> {
  const fn = (globalThis as Record<string, unknown>)[RESOLVER] as UserResolver | undefined;
  if (!fn) return null;
  try {
    return await fn();
  } catch {
    return null; // not inside a request (build, background work)
  }
}

/** Who pays for the call about to be made, or null when nobody can be named. */
export async function who(): Promise<Who | null> {
  const s = store().getStore();
  const content = s?.content === true;
  if (s?.workspaceId) return { workspaceId: s.workspaceId, plan: await planOfWorkspace(s.workspaceId), admin: false, content };
  const userId = await signedInUserId();
  if (!userId) return null;
  const workspaceId = await workspaceOfUser(userId);
  if (!workspaceId) return null;
  return { workspaceId, plan: await planOfWorkspace(workspaceId), admin: await adminUser(userId), content };
}

/* ---- spending counters (micro-dollars) ---- */

const day = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const hash = (key: string) => createHash("sha256").update(`usage:${key}`).digest("hex");
const dayKey = (ws: string) => `data:${ws}:${day()}`;
const monthKey = (ws: string) => `data:${ws}:${month()}`;

async function read(key: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "AuthRateLimit" WHERE "key" = ${hash(key)} AND "resetAt" > now()`;
  return Number(rows[0]?.count ?? 0) / 1e6;
}

async function add(key: string, micro: number, days: number): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetAt")
    VALUES (${hash(key)}, ${micro}, now() + make_interval(days => ${days}))
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "AuthRateLimit"."resetAt" < now() THEN ${micro} ELSE "AuthRateLimit"."count" + ${micro} END,
      "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" < now() THEN now() + make_interval(days => ${days}) ELSE "AuthRateLimit"."resetAt" END`;
}

export async function spentBy(workspaceId: string): Promise<{ today: number; month: number }> {
  const [today, m] = await Promise.all([read(dayKey(workspaceId)), read(monthKey(workspaceId))]);
  return { today, month: m };
}

export async function recordSpend(workspaceId: string, usd: number): Promise<void> {
  const micro = Math.round(usd * 1e6);
  if (!(micro > 0)) return;
  await Promise.all([add(dayKey(workspaceId), micro, 2), add(monthKey(workspaceId), micro, 32)]);
}

/** A refusal message when this workspace has used its allowance, otherwise null. */
export async function overAllowance(w: Who): Promise<string | null> {
  if (w.admin || w.content) return null;
  const { today, month: m } = await spentBy(w.workspaceId);
  const l = w.plan.limits;
  if (m >= l.dataPerMonthUsd) return `This month's data allowance of the ${w.plan.name} plan is used. Saved data is still shown; new data resumes next month or on a higher plan.`;
  if (today >= l.dataPerDayUsd) return `Today's data allowance of the ${w.plan.name} plan is used. Saved data is still shown; new data resumes tomorrow.`;
  return null;
}
