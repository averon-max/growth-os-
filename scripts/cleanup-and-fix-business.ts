import { prisma } from "../src/lib/prisma";

const WORKSPACE_ID = "cmt6q9xyk0001ccql1lave9e2";
const BUSINESS_ID = "cmtjl7vdb00000eqlv0q22t5s";

async function main() {
  const deleted = await prisma.keyword.deleteMany({
    where: { workspaceId: WORKSPACE_ID, text: { startsWith: "[TEST]" } },
  });
  console.log(`Deleted ${deleted.count} test keywords.`);

  const updated = await prisma.business.update({
    where: { id: BUSINESS_ID },
    data: { industry: "credit monitoring and identity protection", location: "New York" },
  });
  console.log("Updated business:", updated);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
