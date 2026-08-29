import { prisma } from "@/lib/prisma";

export interface GetAudienceSegmentsOptions {
  page?: number;
  limit?: number;
}

export async function getAudienceSegments(
  websiteId: string,
  { page = 1, limit = 25 }: GetAudienceSegmentsOptions = {}
) {
  const skip = (page - 1) * limit;

  const [segments, total] = await Promise.all([
    prisma.audienceSegment.findMany({
      where: { websiteId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.audienceSegment.count({ where: { websiteId } }),
  ]);

  return {
    segments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export interface GetAudienceSnapshotsOptions {
  page?: number;
  limit?: number;
}

export async function getAudienceSnapshots(
  segmentId: string,
  { page = 1, limit = 25 }: GetAudienceSnapshotsOptions = {}
) {
  const skip = (page - 1) * limit;

  const [snapshots, total] = await Promise.all([
    prisma.audienceSnapshot.findMany({
      where: { segmentId },
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.audienceSnapshot.count({ where: { segmentId } }),
  ]);

  return {
    snapshots,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getSegmentById(segmentId: string) {
  return prisma.audienceSegment.findUnique({ where: { id: segmentId } });
}
