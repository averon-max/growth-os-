import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/*
 * Monthly usage counters (AI article drafts), stored in the same table as the rate limits.
 * Checked before the expensive work starts and counted only after it succeeds,
 * so a failed generation never uses up the customer's allowance.
 */
const id = (key: string) => createHash("sha256").update(`usage:${key}`).digest("hex");
const month = () => new Date().toISOString().slice(0, 7);
export const articleKey = (userId: string) => `articles:${userId}:${month()}`;

export async function usageCount(key: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "AuthRateLimit" WHERE "key" = ${id(key)} AND "resetAt" > now()`;
  return Number(rows[0]?.count ?? 0);
}

export async function countUsage(key: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "AuthRateLimit" ("key", "count", "resetAt")
    VALUES (${id(key)}, 1, now() + interval '32 days')
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "AuthRateLimit"."resetAt" < now() THEN 1 ELSE "AuthRateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "AuthRateLimit"."resetAt" < now() THEN now() + interval '32 days' ELSE "AuthRateLimit"."resetAt" END`;
}
