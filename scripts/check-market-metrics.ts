import { prisma } from "../src/lib/prisma";
const WORKSPACE_ID = "cmt6q9xyk0001ccql1lave9e2";
async function main() {
  const metrics = await prisma.keywordMarketMetric.findMany({
    where: { keyword: { workspaceId: WORKSPACE_ID } },
    include: { keyword: { select: { text: true } } },
    take: 20,
  });
  console.log(JSON.stringify(metrics.map(m => ({
    keyword: m.keyword.text,
    market: m.market,
    volume: m.volume,
    difficulty: m.difficulty,
    cpc: m.cpc,
  })), null, 2));
}
main().finally(() => process.exit(0));
