import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export class UnauthorizedError extends Error {
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Not authorized for this resource") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<{ id: string; email: string }> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!session?.user || !userId) {
    throw new UnauthorizedError();
  }

  return {
    id: userId,
    email: session.user.email ?? "",
  };
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<{ role: string }> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("You do not have access to this workspace");
  }

  return { role: membership.role };
}

export async function requireWebsiteAccess(userId: string, websiteId: string) {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: { business: true },
  });

  if (!website) {
    throw new ForbiddenError("Website not found or not accessible");
  }

  await requireWorkspaceAccess(userId, website.business.workspaceId);

  return website;
}

export function authErrorResponse(error: unknown): { status: number; body: { error: string } } {
  if (error instanceof UnauthorizedError) {
    return { status: 401, body: { error: "Authentication required" } };
  }
  if (error instanceof ForbiddenError) {
    return { status: 403, body: { error: "Forbidden" } };
  }
  return { status: 500, body: { error: "Server error" } };
}

export async function requireAnalysisAccess(userId: string, analysisId: string) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { website: { include: { business: true } } },
  });

  if (!analysis) {
    throw new ForbiddenError("Analysis not found or not accessible");
  }

  await requireWorkspaceAccess(userId, analysis.website.business.workspaceId);

  return analysis;
}
