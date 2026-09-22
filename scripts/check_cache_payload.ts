import { prisma } from "../src/lib/prisma";

async function main() {
  // Check the old-format cache entries (without market suffix)
  const entries = await prisma.keywordSuggestionCache.findMany({
    where: {
      source: "DATAFORSEO_RELATED",
      normalized: { in: ["credit monitoring", "credit monitoring and identity protection", "credit monitoring:US:English"] }
    },
    select: { normalized: true, fetchedAt: true, payload: true },
  });

  for (const entry of entries) {
    console.log(`\n=== ${entry.normalized} (${entry.fetchedAt.toISOString()}) ===`);
    const payload = entry.payload as Array<Record<string, unknown>>;
    if (!Array.isArray(payload)) { console.log("not array"); continue; }
    console.log(`Total suggestions: ${payload.length}`);
    
    // Find anything with "free credit" or show top 5
    const interesting = payload.filter((s) => 
      typeof s.keyword === "string" && (s.keyword as string).includes("free credit")
    );
    const toShow = interesting.length > 0 ? interesting : payload.slice(0, 3);
    
    for (const s of toShow) {
      console.log(JSON.stringify({
        keyword: s.keyword,
        searchVolume: s.searchVolume,
        trend: s.trend,
        monthlyCount: Array.isArray(s.monthlySearches) ? (s.monthlySearches as unknown[]).length : 0,
        monthlyLast3: Array.isArray(s.monthlySearches) 
          ? (s.monthlySearches as Array<Record<string,unknown>>).slice(-3)
          : [],
      }, null, 2));
    }
  }

  // Also check what keywords exist in workspace
  const kws = await prisma.keyword.findMany({
    take: 10,
    include: { marketMetrics: true },
    orderBy: { updatedAt: "desc" }
  });
  console.log(`\n=== RECENT DB KEYWORDS (${kws.length}) ===`);
  for (const k of kws) {
    const mm = k.marketMetrics[0];
    console.log(`${k.text} | vol: ${mm?.volume ?? k.volume} | diff: ${mm?.difficulty ?? k.difficulty} | metrics: ${k.marketMetrics.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
