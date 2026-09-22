import type {
  Prisma,
} from "@prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import type {
  BusinessFactRegistry,
} from "./business-facts";

import {
  getBusinessFactRegistryForWebsite,
} from "./business-fact-repository";

function asJson(
  value: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonValue;
}

export async function createContentEvidenceSnapshot({
  briefId,
  websiteId,
  topic,
  primaryKeyword,
  searchIntent,
  plan,
  businessFacts,
  keywordContext,
  generatorModel,
}: {
  briefId: string;
  websiteId: string;
  topic: string;
  primaryKeyword: string;
  searchIntent: string;
  plan: unknown;
  businessFacts: BusinessFactRegistry;
  keywordContext: unknown;
  generatorModel: string;
}) {
  return prisma.contentEvidenceSnapshot.create({
    data: {
      briefId,
      websiteId,
      topic,
      primaryKeyword,
      searchIntent,
      plan:
        asJson(plan),
      businessFacts:
        asJson(businessFacts),
      keywordContext:
        keywordContext == null
          ? undefined
          : asJson(
              keywordContext
            ),
      plannerVersion:
        "CONTENT_PLAN_V2",
      gateVersion:
        "CONTENT_GATE_V1",
      generatorModel,
    },
  });
}


export async function getBusinessFactRegistryForBrief({
  briefId,
  websiteId,
}: {
  briefId: string;
  websiteId: string;
}): Promise<BusinessFactRegistry> {
  const snapshot =
    await prisma.contentEvidenceSnapshot.findUnique({
      where: {
        briefId,
      },

      select: {
        businessFacts: true,
      },
    });

  if (snapshot?.businessFacts) {
    const raw =
      JSON.parse(
        JSON.stringify(
          snapshot.businessFacts
        )
      ) as Partial<BusinessFactRegistry>;

    const validVersion =
      raw.version === "BOOTSTRAP_V1" ||
      raw.version === "PERSISTED_V1";

    const validClaims =
      Array.isArray(
        raw.verifiedClaims
      ) &&
      raw.verifiedClaims.every(
        (value) =>
          typeof value === "string"
      );

    const validFactIds =
      Array.isArray(
        raw.factIds
      ) &&
      raw.factIds.every(
        (value) =>
          typeof value === "string"
      );

    const validProhibited =
      Array.isArray(
        raw.prohibitedClaimCategories
      ) &&
      raw.prohibitedClaimCategories.every(
        (value) =>
          typeof value === "string"
      );

    if (
      validVersion &&
      typeof raw.businessName === "string" &&
      typeof raw.websiteUrl === "string" &&
      (
        raw.industry === null ||
        typeof raw.industry === "string"
      ) &&
      validClaims &&
      validFactIds &&
      validProhibited
    ) {
      return raw as BusinessFactRegistry;
    }
  }

  return getBusinessFactRegistryForWebsite(
    websiteId
  );
}
