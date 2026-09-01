import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";
import { customWebsiteProvider } from "./custom-website-provider";
import { UnsupportedFixTypeError, CMSNotConnectedError } from "./provider";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cMSConnection: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/integrations/token-crypto", () => ({
  decryptToken: vi.fn(),
}));

function mockConnection(overrides: Partial<{ status: "CONNECTED" | "DISCONNECTED" | "ERROR"; siteUrl: string; credentialRef: string }> = {}) {
  return {
    id: "conn-1",
    websiteId: "site-1",
    cmsType: "CUSTOM_API" as const,
    status: "CONNECTED" as const,
    siteUrl: "https://example.com",
    usernameRef: null,
    credentialRef: "enc-api-key",
    lastConnectedAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("customWebsiteProvider.verifyCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid:true when the integration API confirms ok:true", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
    const result = await customWebsiteProvider.verifyCredentials("https://example.com", "", "api-key");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("returns valid:false when the integration API returns ok:false", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) }));
    const result = await customWebsiteProvider.verifyCredentials("https://example.com", "", "wrong-key");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("invalid");
  });

  it("returns valid:false with an error message on a non-ok HTTP response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" }));
    const result = await customWebsiteProvider.verifyCredentials("https://example.com", "", "wrong-key");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("401");
  });
});

describe("customWebsiteProvider.applyFix", () => {
  const mockFindUnique = vi.mocked(prisma.cMSConnection.findUnique);
  const mockDecrypt = vi.mocked(decryptToken);

  beforeEach(() => {
    mockFindUnique.mockReset();
    mockDecrypt.mockReset();
    mockDecrypt.mockImplementation((v: string) => v.replace("enc-", ""));
  });

  it("throws UnsupportedFixTypeError for a fix type other than META_TITLE", async () => {
    await expect(
      customWebsiteProvider.applyFix("site-1", { pageUrl: "https://example.com/post", fixType: "H1", newValue: "New H1" })
    ).rejects.toThrow(UnsupportedFixTypeError);
  });

  it("throws CMSNotConnectedError when there is no connection", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(
      customWebsiteProvider.applyFix("site-1", { pageUrl: "https://example.com/post", fixType: "META_TITLE", newValue: "New Title" })
    ).rejects.toThrow(CMSNotConnectedError);
  });

  it("returns SUCCESS and the previous title when the page is resolved and patched", async () => {
    mockFindUnique.mockResolvedValue(mockConnection());
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pages: [{ id: "p1", url: "https://example.com/post", title: "Old Title", metaDescription: null, h1: null }] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "p1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "p1", url: "https://example.com/post", title: "New Title", metaDescription: null, h1: null }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await customWebsiteProvider.applyFix("site-1", {
      pageUrl: "https://example.com/post",
      fixType: "META_TITLE",
      newValue: "New Title",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.previousValue).toBe("Old Title");
    expect(result.verified).toBe(true);
  });

  it("returns FAILED when no page matches the URL", async () => {
    mockFindUnique.mockResolvedValue(mockConnection());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ pages: [] }) }));

    const result = await customWebsiteProvider.applyFix("site-1", {
      pageUrl: "https://example.com/missing-post",
      fixType: "META_TITLE",
      newValue: "New Title",
    });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("Could not resolve");
  });
});
