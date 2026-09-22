import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: "postgresql://user@localhost:5432/signal_db",
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const rows = await prisma.$queryRawUnsafe<Array<{
    websiteId: string;
    zoneId: string;
    encrypted_length: number;
    dot_count: number;
  }>>(
    `SELECT "websiteId", "zoneId",
      length("apiTokenEncrypted") AS encrypted_length,
      length("apiTokenEncrypted") - length(replace("apiTokenEncrypted", '.', '')) AS dot_count
     FROM "CloudflareConnection"
     WHERE "websiteId" = 'cmtjl7vdm00010eqlnt1xbkhd'`
  );

  console.log(JSON.stringify(rows, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
