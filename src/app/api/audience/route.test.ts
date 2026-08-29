import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { getServerSessionMock, prismaMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  prismaMock: {
    workspaceMember: { findUnique: vi.fn() },
    website: { findUnique: vi.fn() },
    audienceSegment: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({ getServerSession: (...args: unknown[]) => getServerSessionMock(...args) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "./route";

describe("GET /api/audience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/audience?websiteId=site1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when websiteId is missing", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    const req = new NextRequest("http://localhost/api/audience");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when website is not accessible to the user", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    prismaMock.website.findUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/audience?websiteId=someone-elses-site");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 with paginated segments when access is valid", async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: "u1", email: "a@b.com" } });
    prismaMock.website.findUnique.mockResolvedValue({ id: "site1", business: { workspaceId: "ws1" } });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "OWNER" });
    prismaMock.audienceSegment.findMany.mockResolvedValue([]);
    prismaMock.audienceSegment.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/audience?websiteId=site1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.segments).toEqual([]);
  });
});
