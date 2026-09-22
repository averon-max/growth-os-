import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { encryptToken } from "../src/lib/integrations/token-crypto";

loadEnvConfig(process.cwd());

const websiteId = "cmtjl7vdm00010eqlnt1xbkhd";
const zoneIdEnv = process.env.CLOUDFLARE_ZONE_ID;
const apiTokenEnv = process.env.CLOUDFLARE_API_TOKEN;

if (!zoneIdEnv || !apiTokenEnv) {
  throw new Error("CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN is missing");
}

const zoneId = zoneIdEnv;
const apiToken = apiTokenEnv;

const pool = new Pool({
  connectionString: "postgresql://user@localhost:5432/signal_db",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const result = await response.json() as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || !result.success) {
    const message = result.errors?.map((e) => e.message).join("; ") || `HTTP ${response.status}`;
    throw new Error(`Cloudflare credentials rejected: ${message}`);
  }

  const apiTokenEncrypted = encryptToken(apiToken);

  const connection = await prisma.cloudflareConnection.upsert({
    where: { websiteId },
    create: { websiteId, zoneId, apiTokenEncrypted },
    update: { zoneId, apiTokenEncrypted },
  });

  console.log(JSON.stringify({
    success: true,
    websiteId,
    zoneId: connection.zoneId,
    encryptedFormat: apiTokenEncrypted.split(".").length === 3 ? "valid" : "invalid",
  }, null, 2));
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
