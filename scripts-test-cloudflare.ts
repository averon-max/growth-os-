import { prisma } from "./src/lib/prisma";
import { fetchCloudflareTraffic } from "./src/lib/integrations/cloudflare/client";

async function main() {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID!;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!;

  if (!zoneId || !apiToken) {
    throw new Error("Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN in env");
  }

  const until = new Date().toISOString().slice(0, 10);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 7);
  const since = sinceDate.toISOString().slice(0, 10);

  console.log(`Fetching traffic for zone ${zoneId} from ${since} to ${until}`);

  const traffic = await fetchCloudflareTraffic({ zoneId, apiToken, since, until });

  console.log(JSON.stringify(traffic, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
