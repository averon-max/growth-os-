import { prisma } from "../src/lib/prisma";

const WORKSPACE_ID = "cmt6q9xyk0001ccql1lave9e2";

async function main() {
  const count = await prisma.keyword.count({ where: { workspaceId: WORKSPACE_ID } });
  console.log(`Total keywords in workspace ${WORKSPACE_ID}: ${count}`);

  const keywords = await prisma.keyword.findMany({
    where: { workspaceId: WORKSPACE_ID },
    include: { snapshots: { orderBy: { date: "desc" }, take: 1 } },
  });

  for (const kw of keywords) {
    console.log(`- ${kw.text} | snapshots: ${kw.snapshots.length} | intent: ${kw.intent ?? "none"}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
