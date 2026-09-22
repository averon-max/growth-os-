import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireUserMock, requireWebsiteAccessMock, syncCloudflareTrafficMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireWebsiteAccessMock: vi.fn(),
  syncCloudflareTrafficMock: vi.fn(),
}));

vi.mock("@/lib/auth-helpers", () => ({
  requireUser: (...args: unknown[]) => requireUserMock(...args),
  requireWebsiteAccess: (...args: unknown[]) => requireWebsiteAccessMock(...args),
  authErrorResponse: (error: unknown) => {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return { status: 401, body: { error: "Unauthorized" } };
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return { status: 403, body: { error: "Forbidden" } };
    }
    return { status: 500, body: { error: "Internal server error" } };
  },
}));

vi.mock("@/lib/integrations/cloudflare/sync", () => ({
  syncCloudflareTraffic: (...args: unknown[]) => syncCloudflareTrafficMock(...args),
}));

import { POST } from "./route";

describe("POST /api/integrations/cloudflare/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserMock.mockRejectedValue(new Error("UNAUTHORIZED"));

    const req = new NextRequest("http://localhost/api/integrations/cloudflare/sync", {
      method: "POST",
      body: JSON.stringify({ websiteId: "site1", days: 7 }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(requireWebsiteAccessMock).not.toHaveBeenCalled();
    expect(syncCloudflareTrafficMock).not.toHaveBeenCalled();
  });

  it("returns 403 when the website is not accessible", async () => {
    requireUserMock.mockResolvedValue({ id: "u1", email: "user@example.com" });
    requireWebsiteAccessMock.mockRejectedValue(new Error("FORBIDDEN"));

    const req = new NextRequest("http://localhost/api/integrations/cloudflare/sync", {
      method: "POST",
      body: JSON.stringify({ websiteId: "someone-elses-site", days: 7 }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(requireWebsiteAccessMock).toHaveBeenCalledWith("u1", "someone-elses-site");
    expect(syncCloudflareTrafficMock).not.toHaveBeenCalled();
  });

  it("returns 400 when days is invalid", async () => {
    requireUserMock.mockResolvedValue({ id: "u1", email: "user@example.com" });

    const req = new NextRequest("http://localhost/api/integrations/cloudflare/sync", {
      method: "POST",
      body: JSON.stringify({ websiteId: "site1", days: 91 }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(requireWebsiteAccessMock).not.toHaveBeenCalled();
    expect(syncCloudflareTrafficMock).not.toHaveBeenCalled();

    const body = await res.json();
    expect(body.error).toContain("between 1 and 90");
  });

  it("returns 400 when days is not an integer", async () => {
    requireUserMock.mockResolvedValue({ id: "u1", email: "user@example.com" });

    const req = new NextRequest("http://localhost/api/integrations/cloudflare/sync", {
      method: "POST",
      body: JSON.stringify({ websiteId: "site1", days: 7.5 }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(requireWebsiteAccessMock).not.toHaveBeenCalled();
    expect(syncCloudflareTrafficMock).not.toHaveBeenCalled();
  });

  it("syncs traffic for an accessible website", async () => {
    requireUserMock.mockResolvedValue({ id: "u1", email: "user@example.com" });
    requireWebsiteAccessMock.mockResolvedValue(undefined);

    syncCloudflareTrafficMock.mockResolvedValue({
      connectionId: "connection1",
      requestedDays: 7,
      syncedDays: 7,
      skippedDays: [],
      availableFrom: "2026-09-05",
      availableTo: "2026-09-11",
    });

    const req = new NextRequest("http://localhost/api/integrations/cloudflare/sync", {
      method: "POST",
      body: JSON.stringify({ websiteId: "site1", days: 7 }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual({
      success: true,
      connectionId: "connection1",
      requestedDays: 7,
      syncedDays: 7,
      skippedDays: [],
      availableFrom: "2026-09-05",
      availableTo: "2026-09-11",
    });

    expect(syncCloudflareTrafficMock).toHaveBeenCalledWith({
      websiteId: "site1",
      since: expect.any(String),
      until: expect.any(String),
    });
  });

  it("never exposes an API token in the response", async () => {
    requireUserMock.mockResolvedValue({ id: "u1", email: "user@example.com" });
    requireWebsiteAccessMock.mockResolvedValue(undefined);

    syncCloudflareTrafficMock.mockResolvedValue({
      connectionId: "connection1",
      requestedDays: 1,
      syncedDays: 1,
      skippedDays: [],
      availableFrom: "2026-09-11",
      availableTo: "2026-09-11",
      apiToken: "super-secret-token",
      apiTokenEncrypted: "encrypted-secret",
    });

    const req = new NextRequest("http://localhost/api/integrations/cloudflare/sync", {
      method: "POST",
      body: JSON.stringify({ websiteId: "site1", days: 1 }),
    });

    const res = await POST(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).not.toContain("super-secret-token");
    expect(text).not.toContain("encrypted-secret");
    expect(text).not.toContain("apiToken");
    expect(text).not.toContain("apiTokenEncrypted");
  });
});
