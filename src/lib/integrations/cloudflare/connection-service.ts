import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/integrations/token-crypto";

export async function upsertCloudflareConnection(
  websiteId: string,
  zoneId: string,
  apiToken: string
) {
  const apiTokenEncrypted = encryptToken(apiToken);

  return prisma.cloudflareConnection.upsert({
    where: { websiteId },
    create: { websiteId, zoneId, apiTokenEncrypted },
    update: { zoneId, apiTokenEncrypted },
  });
}

export async function getCloudflareConnectionWithToken(websiteId: string) {
  const connection = await prisma.cloudflareConnection.findUnique({
    where: { websiteId },
  });

  if (!connection) return null;

  return {
    ...connection,
    apiToken: decryptToken(connection.apiTokenEncrypted),
  };
}
