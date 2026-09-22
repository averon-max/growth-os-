import { prisma } from "../src/lib/prisma";

async function main() {
  // Check cache for "free credit monitoring"
  const cached = await prisma.keywordSuggestionCache.findMany({
    where: { normalized: { contains: "free credit" } },
    select: { normalized: true, source: true, fetchedAt: true, payload: true },
  });

  console.log(`\n=== CACHE ENTRIES (${cached.length}) ===`);
  for (const c of cached) {
    console.log(`\nKey: ${c.normalized} | Source: ${c.source} | Fetched: ${c.fetchedAt.toISOString()}`);
    const payload = c.payload as Array<Record<string, unknown>>;
    if (Array.isArray(payload)) {
      const match = payload.find((s) => typeof s.keyword === "string" && (s.keyword as string).includes("free credit monitoring"));
      if (match) {
        console.log("FOUND in cache:", JSON.stringify({
          keyword: match.keyword,
          searchVolume: match.searchVolume,
          trend: match.trend,
          monthlyCount: Array.isArray(match.monthlySearches) ? (match.monthlySearches as unknown[]).length : 0,
          monthlyLast4: Array.isArray(match.monthlySearches) ? (match.monthlySearches as Array<Record<string,unknown>>).slice(-4) : [],
        }, null, 2));
      } else {
        console.log("Sample keywords:", payload.slice(0, 3).map((s) => s.keyword));
      }
    }
  }

  // Check DB keyword directly
  const kw = await prisma.keyword.findFirst({
    where: { text: { contains: "free credit monitoring", mode: "insensitive" } },
    include: { marketMetrics: true, snapshots: { orderBy: { date: "desc" }, take: 3 } },
  });

  console.log("\n=== DB KEYWORD ===");
  if (kw) {
    console.log("text:", kw.text);
    console.log("legacy volume:", kw.volume, "| difficulty:", kw.difficulty);
    console.log("marketMetrics:", JSON.stringify(kw.marketMetrics, null, 2));
    console.log("recent snapshots:", JSON.stringify(kw.snapshots, null, 2));
  } else {
    console.log("NOT FOUND in Keyword table");
  }

  // Show all cache keys
  const allKeys = await prisma.keywordSuggestionCache.findMany({
    select: { normalized: true, source: true, fetchedAt: true },
    orderBy: { fetchedAt: "desc" },
    take: 20,
  });
  console.log("\n=== ALL RECENT CACHE KEYS ===");
  for (const k of allKeys) {
    console.log(`${k.source} | ${k.normalized} | ${k.fetchedAt.toISOString()}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
