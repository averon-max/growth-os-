import { prisma } from "@/lib/prisma";

import {
  buildPersistedBusinessFactRegistry,
  type BusinessFactRegistry,
} from "./business-facts";

export async function getBusinessFactRegistryForWebsite(
  websiteId: string
): Promise<BusinessFactRegistry> {
  const website =
    await prisma.website.findUnique({
      where: {
        id: websiteId,
      },
      select: {
        url: true,
        business: {
          select: {
            name: true,
            industry: true,
            businessFacts: {
              where: {
                status: "VERIFIED",

                  evidenceStatus: {
                    in: [
                      "UNCHECKED",
                      "FRESH",
                    ],
                  },
              },
              orderBy: [
                {
                  verifiedAt: "asc",
                },
                {
                  createdAt: "asc",
                },
              ],
              select: {
                id: true,
                claim: true,
              },
            },
          },
        },
      },
    });

  if (!website) {
    throw new Error(
      "Website not found while loading Business Fact Registry"
    );
  }

  return buildPersistedBusinessFactRegistry({
    businessName:
      website.business.name,
    websiteUrl:
      website.url,
    industry:
      website.business.industry,
    facts:
      website.business.businessFacts,
  });
}
