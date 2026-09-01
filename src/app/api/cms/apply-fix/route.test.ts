import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: { findUnique: vi.fn() },
    workspaceMember: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/cms/service", () => ({ applyFix: vi.fn() }));
vi.mock("@/lib/cms/wordpress-provider", () => ({ wordpressProvider: {} }));

function mockSession(userId: string): Session {
  return { user: { id: userId, email: "user1@example.com" } } as unknown as Session;
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/cms/apply-fix", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/cms/apply-fix", () => {
  const mockGetServerSession = vi.mocked(getServerSession);
  const mockWebsiteFindUnique = vi.mocked(prisma.website.findUnique);

  beforeEach(() => {
    mockGetServerSession.mockReset();
    mockWebsiteFindUnique.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(postRequest({ websiteId: "w1", pageUrl: "https://x.com/p", fixType: "META_TITLE", newValue: "T" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockGetServerSession.mockResolvedValue(mockSession("user-1"));
    const res = await POST(postRequest({ websiteId: "w1" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when the website is not accessible", async () => {
    mockGetServerSession.mockResolvedValue(mockSession("user-1"));
    mockWebsiteFindUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ websiteId: "w1", pageUrl: "https://x.com/p", fixType: "META_TITLE", newValue: "T" }));
    expect(res.status).toBe(403);
  });
});
