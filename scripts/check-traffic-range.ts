import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const websiteId = "cmtjl7vdm00010eqlnt1xbkhd";

async function main() {
  const connection = await prisma.cloudflareConnection.findUnique({
    where: { websiteId },
  });

  if (!connection) {
    console.log("NO CLOUDFLARE CONNECTION");
    return;
  }

  const snapshots = await prisma.trafficSnapshot.findMany({
    where: { connectionId: connection.id },
    orderBy: { date: "asc" },
    select: { date: true, totalRequests: true },
  });

  console.log("ALL SNAPSHOTS:");
  for (const s of snapshots) {
    console.log(
      s.date.toISOString().slice(0, 10),
      s.totalRequests
    );
  }

  const today = new Date();
  const until = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  for (const days of [7, 14, 30]) {
    const since = new Date(until);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const result = await prisma.trafficSnapshot.findMany({
      where: {
        connectionId: connection.id,
        date: { gte: since, lte: until },
      },
      orderBy: { date: "asc" },
      select: { date: true, totalRequests: true },
    });

    console.log(`\n${days} DAYS:`);
    console.log("count:", result.length);
    console.log(
      "dates:",
      result.map((s) => s.date.toISOString().slice(0, 10))
    );
    console.log(
      "requests:",
      result.reduce((sum, s) => sum + s.totalRequests, 0)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
