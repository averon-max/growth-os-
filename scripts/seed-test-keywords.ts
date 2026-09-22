import { prisma } from "../src/lib/prisma";

// Change this if your websiteId differs from what's in the URL bar on /dashboard/keywords
const WEBSITE_ID = "cmtjl7vdm00010eqlnt1xbkhd";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function upsertKeyword(workspaceId: string, text: string) {
  const normalized = normalize(text);
  return prisma.keyword.upsert({
    where: { workspaceId_normalized: { workspaceId, normalized } },
    create: { workspaceId, text, normalized },
    update: {},
  });
}

async function addSnapshot(keywordId: string, opts: {
  date: Date;
  position?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  pageUrl?: string;
}) {
  return prisma.keywordSnapshot.upsert({
    where: {
      keywordId_date_device_country_source_pageUrl: {
        keywordId,
        date: opts.date,
        device: "DESKTOP",
        country: "us",
        source: "GOOGLE_SEARCH_CONSOLE",
        pageUrl: opts.pageUrl ?? "",
      },
    },
    create: {
      keywordId,
      date: opts.date,
      position: opts.position,
      clicks: opts.clicks,
      impressions: opts.impressions,
      ctr: opts.ctr,
      pageUrl: opts.pageUrl,
    },
    update: {},
  });
}

async function main() {
  const website = await prisma.website.findUnique({
    where: { id: WEBSITE_ID },
    include: { business: true },
  });
  if (!website) throw new Error(`Website ${WEBSITE_ID} not found -- check the ID in your URL bar`);

  const workspaceId = website.business.workspaceId;
  console.log(`Seeding test keywords for workspace ${workspaceId} (website ${website.url})`);

  // 1. QUICK_WIN -- position 11-20, impressions >= 100
  const quickWin = await upsertKeyword(workspaceId, "[TEST] credit report checker");
  await addSnapshot(quickWin.id, { date: daysAgo(0), position: 15, clicks: 3, impressions: 150, ctr: 0.02, pageUrl: `${website.url}/pricing` });

  // 2. HIGH_IMPRESSION_LOW_CTR -- impressions >= 500, ctr <= 0.03
  const highImpLowCtr = await upsertKeyword(workspaceId, "[TEST] credit score check");
  await addSnapshot(highImpLowCtr.id, { date: daysAgo(0), position: 8, clicks: 12, impressions: 600, ctr: 0.02, pageUrl: `${website.url}/features` });

  // 3. DECLINING -- current window avg position worse (higher) than previous window
  const declining = await upsertKeyword(workspaceId, "[TEST] identity theft protection");
  await addSnapshot(declining.id, { date: daysAgo(40), position: 5, clicks: 20, impressions: 400, ctr: 0.05, pageUrl: `${website.url}/identity` });
  await addSnapshot(declining.id, { date: daysAgo(0), position: 15, clicks: 4, impressions: 350, ctr: 0.01, pageUrl: `${website.url}/identity` });

  // 4. GROWING -- current window avg position better (lower) than previous window
  const growing = await upsertKeyword(workspaceId, "[TEST] background check service");
  await addSnapshot(growing.id, { date: daysAgo(40), position: 20, clicks: 2, impressions: 200, ctr: 0.01, pageUrl: `${website.url}/background-check` });
  await addSnapshot(growing.id, { date: daysAgo(0), position: 6, clicks: 25, impressions: 500, ctr: 0.05, pageUrl: `${website.url}/background-check` });

  // 5. LOST -- last (and only) snapshot is 20 days old (>= 14-day threshold)
  const lost = await upsertKeyword(workspaceId, "[TEST] credit monitoring service");
  await addSnapshot(lost.id, { date: daysAgo(20), position: 30, clicks: 1, impressions: 90, ctr: 0.01, pageUrl: `${website.url}/monitoring` });

  // 6. CANNIBALIZATION -- two different pages ranking for the same keyword on the same date
  const cannibal = await upsertKeyword(workspaceId, "[TEST] free credit score");
  await addSnapshot(cannibal.id, { date: daysAgo(0), position: 12, clicks: 5, impressions: 300, ctr: 0.02, pageUrl: `${website.url}/pricing` });
  await addSnapshot(cannibal.id, { date: daysAgo(0), position: 18, clicks: 2, impressions: 200, ctr: 0.01, pageUrl: `${website.url}/plans` });

  console.log("Done. 6 test keywords seeded, one per signal type.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
