import { prisma } from "../src/lib/prisma";

async function main() {
  const businesses = await prisma.business.findMany({
    include: { websites: true },
  });
  console.log(JSON.stringify(businesses, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
