import { prisma } from "../src/lib/prisma";

async function main() {
  const rows = await prisma.keywordSuggestionCache.findMany();
  console.log(JSON.stringify(rows, null, 2));
}

main().finally(() => process.exit(0));
