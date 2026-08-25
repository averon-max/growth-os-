import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspaceMember: { findUnique: vi.fn() },
  },
}));

function mockSession(userId: string): Session {
  // Cast: NextAuth's base Session type doesn't declare user.id — this app
  // adds it via its own runtime cast inside requireUser(). Mirrored here
  // for test data only; does not weaken any production type-check.
  return { user: { id: userId, email: "user1@example.com" } } as unknown as Session;
}

describe("GET /api/keywords", () => {
  const mockGetServerSession = vi.mocked(getServerSession);
  const mockFindUnique = vi.mocked(prisma.workspaceMember.findUnique);

  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockFindUnique.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/keywords?workspaceId=ws-1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when workspaceId is missing", async () => {
    mockGetServerSession.mockResolvedValue(mockSession("user-1"));
    const req = new NextRequest("http://localhost/api/keywords");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when the user is not a member of the workspace", async () => {
    mockGetServerSession.mockResolvedValue(mockSession("user-1"));
    mockFindUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/keywords?workspaceId=wrong-ws");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});
