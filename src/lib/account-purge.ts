import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";

/*
 * What an account deletion must also clean up, beyond the database cascades.
 * A few tables keep a website or workspace id as plain text (no foreign key), so deleting a workspace
 * never reaches them: imported backlinks (CSV / Bing) and daily usage counters. They are removed here,
 * inside the same transaction as the workspace itself.
 */
export async function purgeLooseRows(tx: Prisma.TransactionClient, workspaceIds: string[]): Promise<void> {
  if (workspaceIds.length === 0) return;
  const sites = await tx.website.findMany({ where: { business: { workspaceId: { in: workspaceIds } } }, select: { id: true } });
  if (sites.length > 0) await tx.siteBacklink.deleteMany({ where: { websiteId: { in: sites.map((s) => s.id) } } });
  await tx.apiUsageCounter.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
}

/**
 * A workspace that still has other members is kept when its owner leaves: the oldest other member becomes
 * the owner, so the workspace is never left without someone who can manage it. Returns the workspaces handed over.
 */
export async function handOver(tx: Prisma.TransactionClient, workspaceIds: string[], leavingUserId: string): Promise<string[]> {
  const kept: string[] = [];
  for (const workspaceId of workspaceIds) {
    const next = await tx.workspaceMember.findFirst({ where: { workspaceId, userId: { not: leavingUserId } }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!next) continue;
    await tx.workspaceMember.update({ where: { id: next.id }, data: { role: "OWNER" } });
    kept.push(workspaceId);
  }
  return kept;
}

/** Reads the Google tokens of these workspaces before they are deleted, so they can be revoked afterwards. */
export async function googleTokens(workspaceIds: string[]): Promise<string[]> {
  if (workspaceIds.length === 0) return [];
  const rows = await prisma.providerConnection.findMany({
    where: { workspaceId: { in: workspaceIds } },
    select: { refreshTokenRef: true, accessTokenRef: true },
  });
  const tokens = new Set<string>();
  for (const r of rows) {
    const ref = r.refreshTokenRef ?? r.accessTokenRef;
    if (!ref) continue;
    try {
      tokens.add(decryptToken(ref));
    } catch {
      // an unreadable token can't be revoked; it is deleted with the workspace anyway
    }
  }
  return [...tokens];
}

/**
 * Best effort, after the data is gone: asks Google to drop the Search Console and Analytics access the user
 * granted, so nothing can read their Google data any more. Never fails a deletion; returns how many were revoked.
 */
export async function revokeGoogleTokens(tokens: string[]): Promise<number> {
  let revoked = 0;
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token }).toString(),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) revoked++;
      } catch {
        // Google unreachable: the token is already deleted from our database
      }
    }),
  );
  return revoked;
}
