import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Data retention tiers. 0 = keep forever.
 * Forever (never auto-deleted): users, workspaces, subscriptions, businesses, websites, keywords,
 * tracked keywords, approved/published articles, briefs, business facts, outcome tracking, applied fixes.
 * History tables (rankings, traffic, audience) are kept forever but compacted: daily → weekly after 30 days, monthly after a year.
 */
export const TIERS = {
  reports: {
    label: "Audits & reports",
    help: "Old site audits (pages, issues, opportunities), SERP checks, failed or rejected articles. The latest audit per site is always kept.",
    def: 14, min: 1, max: 365, allowForever: true,
  },
  caches: {
    label: "Competitor & backlink scans",
    help: "Older competitor and backlink snapshots. The latest scan for each competitor and article is always kept.",
    def: 30, min: 7, max: 365, allowForever: true,
  },
  drafts: {
    label: "Unfinished drafts",
    help: "Drafts and articles in review that nobody has touched. Approved and published articles are never deleted.",
    def: 0, min: 7, max: 365, allowForever: true,
  },
  history: {
    label: "Compact ranking & traffic history",
    help: "Keep every day for 30 days, then one point per week, then one per month after a year. Saves ~90% of space.",
    def: 1, min: 0, max: 1, allowForever: false, toggle: true,
  },
} as const;

export type TierKey = keyof typeof TIERS;
export type RetentionSettings = Record<TierKey, number>;

export function defaults(): RetentionSettings {
  return Object.fromEntries(Object.entries(TIERS).map(([k, t]) => [k, t.def])) as RetentionSettings;
}

/** Merge stored JSON with defaults and clamp every value to its allowed range. */
export function normalize(raw: unknown): RetentionSettings {
  const out = defaults();
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  for (const [key, tier] of Object.entries(TIERS) as [TierKey, (typeof TIERS)[TierKey]][]) {
    const v = Number(src[key]);
    if (!Number.isFinite(v)) continue;
    const n = Math.round(v);
    if ("toggle" in tier && tier.toggle) out[key] = n ? 1 : 0;
    else if (n === 0 && tier.allowForever) out[key] = 0;
    else out[key] = Math.min(tier.max, Math.max(tier.min, n));
  }
  return out;
}

// System-wide limits (not user-configurable): security and billing records.
const GLOBAL = { apiCacheDays: 30, suggestionCacheDays: 30, resetTokenDays: 7, stripeEventDays: 30, usageCounterDays: 62 };

type Counts = Record<string, number>;

async function run(counts: Counts, name: string, sql: string, ...params: unknown[]) {
  try {
    counts[name] = (counts[name] ?? 0) + (await prisma.$executeRawUnsafe(sql, ...params));
  } catch (error) {
    console.error(`[retention] ${name}`, error);
    counts[name + ":error"] = 1;
  }
}

/** Compacts a dated history table: keep daily rows for 30 days, then the latest row per week, then per month after 365 days. */
function compactSql(table: string, dateCol: string, partition: string, scope: string) {
  const bucket = `date_trunc(CASE WHEN t."${dateCol}" < current_date - 365 THEN 'month' ELSE 'week' END, t."${dateCol}"::timestamp)`;
  return `
    DELETE FROM "${table}" x
    WHERE x."${dateCol}" < current_date - 30
      AND x.id IN (SELECT t.id FROM "${table}" t WHERE ${scope})
      AND x.id NOT IN (
        SELECT DISTINCT ON (${partition}, ${bucket}) t.id
        FROM "${table}" t
        WHERE ${scope} AND t."${dateCol}" < current_date - 30
        ORDER BY ${partition}, ${bucket}, t."${dateCol}" DESC
      )`;
}

const WEBSITES_OF = `SELECT w.id FROM "Website" w JOIN "Business" b ON b.id = w."businessId" WHERE b."workspaceId" = $1`;

export async function cleanWorkspace(workspaceId: string, s: RetentionSettings, counts: Counts) {
  if (s.reports > 0) {
    await run(counts, "analyses", `
      DELETE FROM "Analysis" a
      WHERE a."websiteId" IN (${WEBSITES_OF})
        AND a."createdAt" < now() - make_interval(days => $2)
        AND a.id NOT IN (SELECT DISTINCT ON ("websiteId") id FROM "Analysis" WHERE "websiteId" IN (${WEBSITES_OF})
                         ORDER BY "websiteId", "completedAt" DESC NULLS LAST, "createdAt" DESC)`, workspaceId, s.reports);

    await run(counts, "serpReplays", `
      DELETE FROM "SerpReplayArtifact" r
      WHERE r."createdAt" < now() - make_interval(days => $2)
        AND r."contentArticleId" IN (SELECT ca.id FROM "ContentArticle" ca JOIN "ContentBrief" cb ON cb.id = ca."briefId" WHERE cb."websiteId" IN (${WEBSITES_OF}))
        AND r.id NOT IN (SELECT DISTINCT ON ("contentArticleId") id FROM "SerpReplayArtifact" ORDER BY "contentArticleId", "createdAt" DESC)`,
      workspaceId, s.reports);

    await run(counts, "failedArticles", `
      DELETE FROM "ContentArticle" ca
      WHERE ca.status IN ('REJECTED', 'PUBLISH_FAILED', 'BLOCKED_EXTERNAL')
        AND ca."updatedAt" < now() - make_interval(days => $2)
        AND ca."briefId" IN (SELECT id FROM "ContentBrief" WHERE "websiteId" IN (${WEBSITES_OF}))`, workspaceId, s.reports);
  }

  if (s.caches > 0) {
    await run(counts, "competitorSnapshots", `
      DELETE FROM "CompetitorSnapshot" cs
      WHERE cs."capturedAt" < now() - make_interval(days => $2)
        AND cs."competitorId" IN (SELECT id FROM "Competitor" WHERE "websiteId" IN (${WEBSITES_OF}))
        AND cs.id NOT IN (SELECT DISTINCT ON ("competitorId") id FROM "CompetitorSnapshot" ORDER BY "competitorId", "capturedAt" DESC)`,
      workspaceId, s.caches);

    await run(counts, "backlinkSnapshots", `
      DELETE FROM "BacklinkSnapshot" bs
      WHERE bs."capturedAt" < now() - make_interval(days => $2)
        AND bs."targetId" IN (SELECT id FROM "BacklinkTarget" WHERE "websiteId" IN (${WEBSITES_OF}))
        AND bs.id NOT IN (SELECT DISTINCT ON ("targetId") id FROM "BacklinkSnapshot" ORDER BY "targetId", "capturedAt" DESC)`,
      workspaceId, s.caches);
  }

  if (s.drafts > 0) {
    await run(counts, "staleDrafts", `
      DELETE FROM "ContentArticle" ca
      WHERE ca.status IN ('DRAFT', 'IN_REVIEW', 'GENERATING')
        AND ca."updatedAt" < now() - make_interval(days => $2)
        AND ca."briefId" IN (SELECT id FROM "ContentBrief" WHERE "websiteId" IN (${WEBSITES_OF}))`, workspaceId, s.drafts);
  }

  if (s.history) {
    await run(counts, "compactRankings",
      compactSql("KeywordSnapshot", "date", `t."keywordId", t.device, t.country, t.source, t."pageUrl"`,
        `t."keywordId" IN (SELECT id FROM "Keyword" WHERE "workspaceId" = $1)`), workspaceId);
    await run(counts, "compactTraffic",
      compactSql("TrafficSnapshot", "date", `t."connectionId"`,
        `t."connectionId" IN (SELECT id FROM "CloudflareConnection" WHERE "websiteId" IN (${WEBSITES_OF}))`), workspaceId);
    await run(counts, "compactPageTraffic",
      compactSql("PageTrafficSnapshot", "date", `t."connectionId", t.path`,
        `t."connectionId" IN (SELECT id FROM "CloudflareConnection" WHERE "websiteId" IN (${WEBSITES_OF}))`), workspaceId);
    await run(counts, "compactAudience",
      compactSql("AudienceSnapshot", "date", `t."segmentId", t.source`,
        `t."segmentId" IN (SELECT id FROM "AudienceSegment" WHERE "websiteId" IN (${WEBSITES_OF}))`), workspaceId);
  }
}

export async function cleanGlobal(counts: Counts) {
  await run(counts, "apiCache", `DELETE FROM "ApiCache" WHERE "updatedAt" < now() - make_interval(days => $1)`, GLOBAL.apiCacheDays);
  await run(counts, "suggestionCache", `DELETE FROM "KeywordSuggestionCache" WHERE "fetchedAt" < now() - make_interval(days => $1)`, GLOBAL.suggestionCacheDays);
  await run(counts, "rateLimits", `DELETE FROM "AuthRateLimit" WHERE "resetAt" < now() - interval '1 day'`);
  await run(counts, "resetTokens", `DELETE FROM "PasswordResetToken" WHERE "expiresAt" < now() - make_interval(days => $1)`, GLOBAL.resetTokenDays);
  await run(counts, "stripeEvents", `DELETE FROM "StripeEvent" WHERE "receivedAt" < now() - make_interval(days => $1)`, GLOBAL.stripeEventDays);
  await run(counts, "usageCounters", `DELETE FROM "ApiUsageCounter" WHERE "date" < current_date - $1::int`, GLOBAL.usageCounterDays);
}

export async function runRetention() {
  const counts: Counts = {};
  await cleanGlobal(counts);
  const workspaces = await prisma.workspace.findMany({ select: { id: true, retention: true } });
  for (const w of workspaces) await cleanWorkspace(w.id, normalize(w.retention), counts);

  const size = await prisma.$queryRawUnsafe<{ bytes: bigint }[]>(`SELECT pg_database_size(current_database()) AS bytes`);
  return { workspaces: workspaces.length, deleted: counts, databaseMB: Math.round(Number(size[0]?.bytes ?? 0) / 1048576) };
}
