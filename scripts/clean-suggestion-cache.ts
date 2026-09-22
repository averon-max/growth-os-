import { prisma } from "../src/lib/prisma";

async function main() {
  const targets = ["credit monitoring and identity protection", "porn", "зщкт"];
  const result = await prisma.keywordSuggestionCache.deleteMany({
    where: { normalized: { in: targets } },
  });
  console.log("Deleted:", result.count);
}

main().finally(() => process.exit(0));
