import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/integrations/token-crypto";
import type { CMSType } from "./types";

const APPLIED_FIXES_DEFAULT_PAGE_SIZE = 25;
const APPLIED_FIXES_MAX_PAGE_SIZE = 100;

export async function getCMSConnection(websiteId: string) {
  return prisma.cMSConnection.findUnique({ where: { websiteId } });
}

export interface UpsertCMSConnectionInput {
  websiteId: string;
  cmsType: CMSType;
  siteUrl: string;
  username?: string;
  password: string;
}

export async function upsertCMSConnection(input: UpsertCMSConnectionInput) {
  const usernameRef = input.username ? encryptToken(input.username) : null;
  const credentialRef = encryptToken(input.password);

  return prisma.cMSConnection.upsert({
    where: { websiteId: input.websiteId },
    create: {
      websiteId: input.websiteId,
      cmsType: input.cmsType,
      siteUrl: input.siteUrl,
      usernameRef,
      credentialRef,
      status: "DISCONNECTED",
    },
    update: {
      cmsType: input.cmsType,
      siteUrl: input.siteUrl,
      usernameRef,
      credentialRef,
      status: "DISCONNECTED",
      lastError: null,
    },
  });
}

export async function markCMSConnectionStatus(websiteId: string, status: "CONNECTED" | "ERROR", error?: string) {
  return prisma.cMSConnection.update({
    where: { websiteId },
    data: {
      status,
      lastConnectedAt: status === "CONNECTED" ? new Date() : undefined,
      lastError: status === "ERROR" ? (error ?? "Unknown error") : null,
    },
  });
}

export interface GetAppliedFixesOptions {
  page?: number;
  limit?: number;
}

export async function getAppliedFixes(cmsConnectionId: string, { page = 1, limit = APPLIED_FIXES_DEFAULT_PAGE_SIZE }: GetAppliedFixesOptions = {}) {
  const boundedLimit = Math.min(APPLIED_FIXES_MAX_PAGE_SIZE, Math.max(1, limit));
  const skip = (page - 1) * boundedLimit;

  const [items, total] = await Promise.all([
    prisma.appliedFix.findMany({
      where: { cmsConnectionId },
      orderBy: { createdAt: "desc" },
      skip,
      take: boundedLimit,
    }),
    prisma.appliedFix.count({ where: { cmsConnectionId } }),
  ]);

  return {
    items,
    page,
    limit: boundedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / boundedLimit)),
  };
}

export async function getAppliedFixesForWorkspace(workspaceId: string, options: GetAppliedFixesOptions = {}) {
  const boundedLimit = Math.min(APPLIED_FIXES_MAX_PAGE_SIZE, Math.max(1, options.limit ?? APPLIED_FIXES_DEFAULT_PAGE_SIZE));
  const page = options.page ?? 1;
  const skip = (page - 1) * boundedLimit;

  const where = { cmsConnection: { website: { business: { workspaceId } } } };

  const [items, total] = await Promise.all([
    prisma.appliedFix.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: boundedLimit,
      include: { cmsConnection: { include: { website: { include: { business: true } } } } },
    }),
    prisma.appliedFix.count({ where }),
  ]);

  return {
    items,
    page,
    limit: boundedLimit,
    total,
    totalPages: Math.max(1, Math.ceil(total / boundedLimit)),
  };
}
