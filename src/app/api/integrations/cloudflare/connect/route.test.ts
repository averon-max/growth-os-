import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { requireUserMock, requireWebsiteAccessMock, upsertCloudflareConnectionMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  requireWebsiteAccessMock: vi.fn(),
  upsertCloudflareConnectionMock: vi.fn(),
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

vi.mock("@/lib/integrations/cloudflare/connection-service", () => ({
  upsertCloudflareConnection: (...args: unknown[]) =>
    upsertCloudflareConnectionMock(...args),
}));

import { POST } from "./route";

describe("POST /api/integrations/cloudflare/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    requireUserMock.mockRejectedValue(new Error("UNAUTHORIZED"));

    const req = new NextRequest(
      "http://localhost/api/integrations/cloudflare/connect",
      {
        method: "POST",
        body: JSON.stringify({
          websiteId: "site1",
          zoneId: "zone1",
          apiToken: "secret-token",
        }),
      }
    );

    const res = await POST(req);

    expect(res.status).toBe(401);
    expect(requireWebsiteAccessMock).not.toHaveBeenCalled();
    expect(upsertCloudflareConnectionMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    requireUserMock.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
    });

    const req = new NextRequest(
      "http://localhost/api/integrations/cloudflare/connect",
      {
        method: "POST",
        body: JSON.stringify({
          websiteId: "site1",
          zoneId: "zone1",
        }),
      }
    );

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(requireWebsiteAccessMock).not.toHaveBeenCalled();
    expect(upsertCloudflareConnectionMock).not.toHaveBeenCalled();

    const body = await res.json();
    expect(body.error).toContain("apiToken");
  });

  it("returns 403 when the website is not accessible", async () => {
    requireUserMock.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
    });
    requireWebsiteAccessMock.mockRejectedValue(new Error("FORBIDDEN"));

    const req = new NextRequest(
      "http://localhost/api/integrations/cloudflare/connect",
      {
        method: "POST",
        body: JSON.stringify({
          websiteId: "someone-elses-site",
          zoneId: "zone1",
          apiToken: "secret-token",
        }),
      }
    );

    const res = await POST(req);

    expect(res.status).toBe(403);
    expect(requireWebsiteAccessMock).toHaveBeenCalledWith(
      "u1",
      "someone-elses-site"
    );
    expect(upsertCloudflareConnectionMock).not.toHaveBeenCalled();
  });

  it("connects Cloudflare for an accessible website", async () => {
    requireUserMock.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
    });
    requireWebsiteAccessMock.mockResolvedValue(undefined);
    upsertCloudflareConnectionMock.mockResolvedValue({
      id: "connection1",
      websiteId: "site1",
      zoneId: "zone1",
    });

    const req = new NextRequest(
      "http://localhost/api/integrations/cloudflare/connect",
      {
        method: "POST",
        body: JSON.stringify({
          websiteId: "site1",
          zoneId: "zone1",
          apiToken: "secret-token",
        }),
      }
    );

    const res = await POST(req);

    expect(res.status).toBe(200);

    const body = await res.json();

    expect(body).toEqual({
      success: true,
      connectionId: "connection1",
      zoneId: "zone1",
    });

    expect(upsertCloudflareConnectionMock).toHaveBeenCalledWith(
      "site1",
      "zone1",
      "secret-token"
    );
  });

  it("never exposes API tokens in the response", async () => {
    requireUserMock.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
    });
    requireWebsiteAccessMock.mockResolvedValue(undefined);

    upsertCloudflareConnectionMock.mockResolvedValue({
      id: "connection1",
      websiteId: "site1",
      zoneId: "zone1",
      apiToken: "super-secret-token",
      apiTokenEncrypted: "encrypted-secret",
    });

    const req = new NextRequest(
      "http://localhost/api/integrations/cloudflare/connect",
      {
        method: "POST",
        body: JSON.stringify({
          websiteId: "site1",
          zoneId: "zone1",
          apiToken: "super-secret-token",
        }),
      }
    );

    const res = await POST(req);
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).not.toContain("super-secret-token");
    expect(text).not.toContain("encrypted-secret");
    expect(text).not.toContain("apiToken");
    expect(text).not.toContain("apiTokenEncrypted");
  });
});
