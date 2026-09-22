import { prisma } from "../src/lib/prisma";

const WEBSITE_ID = "cmtjl7vdm00010eqlnt1xbkhd";

async function main() {
  const connection = await prisma.cMSConnection.findUnique({ where: { websiteId: WEBSITE_ID } });
  console.log(JSON.stringify(connection, null, 2));
}

main().finally(() => process.exit(0));
