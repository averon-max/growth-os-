import { prisma } from "@/lib/prisma";
import type { CMSProvider } from "./provider";
import { CMSNotConnectedError } from "./provider";
import type { FixType, FixRiskLevel } from "./types";

const FIX_RISK_LEVEL: Record<FixType, FixRiskLevel> = {
  META_TITLE: "SAFE",
  META_DESCRIPTION: "SAFE",
  H1: "REVIEW",
  ALT_TEXT: "SAFE",
  CANONICAL: "REVIEW",
  INTERNAL_LINK: "REVIEW",
  CONTENT: "DANGEROUS",
};

export interface ApplyOpportunityFixInput {
  websiteId: string;
  opportunityId?: string;
  issueId?: string;
  pageUrl: string;
  fixType: FixType;
  newValue: string;
}

export async function applyFix(provider: CMSProvider, input: ApplyOpportunityFixInput) {
  const connection = await prisma.cMSConnection.findUnique({ where: { websiteId: input.websiteId } });
  if (!connection) {
    throw new CMSNotConnectedError();
  }

  const pendingFix = await prisma.appliedFix.create({
    data: {
      cmsConnectionId: connection.id,
      opportunityId: input.opportunityId,
      issueId: input.issueId,
      pageUrl: input.pageUrl,
      fixType: input.fixType,
      riskLevel: FIX_RISK_LEVEL[input.fixType],
      newValue: input.newValue,
      status: "PENDING",
    },
  });

  const result = await provider.applyFix(input.websiteId, {
    pageUrl: input.pageUrl,
    fixType: input.fixType,
    newValue: input.newValue,
  });

  const isVerifiedSuccess = result.status === "SUCCESS" && result.verified;
  const finalStatus = isVerifiedSuccess ? "SUCCESS" : "FAILED";
  const finalError = isVerifiedSuccess
    ? null
    : result.errorMessage ?? "The change was applied but could not be verified against the live page.";

  const updated = await prisma.appliedFix.update({
    where: { id: pendingFix.id },
    data: {
      status: finalStatus,
      previousValue: result.previousValue,
      errorMessage: finalError,
      appliedAt: new Date(),
      verifiedAt: isVerifiedSuccess ? new Date() : null,
    },
  });

  return updated;
}
