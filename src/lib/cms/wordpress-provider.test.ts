import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";
import { wordpressProvider } from "./wordpress-provider";
import { UnsupportedFixTypeError, CMSNotConnectedError } from "./provider";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cMSConnection: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/integrations/token-crypto", () => ({
  decryptToken: vi.fn(),
}));

function mockConnection(overrides: Partial<{ status: "CONNECTED" | "DISCONNECTED" | "ERROR"; siteUrl: string; usernameRef: string; credentialRef: string }> = {}) {
  return {
    id: "conn-1",
    websiteId: "site-1",
    cmsType: "WORDPRESS" as const,
    status: "CONNECTED" as const,
    siteUrl: "https://example.com",
    usernameRef: "enc-username",
    credentialRef: "enc-password",
    lastConnectedAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("wordpressProvider.verifyCredentials", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid:true when the WordPress API responds ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) }));
    const result = await wordpressProvider.verifyCredentials("https://example.com", "admin", "secret");
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("returns valid:false with an error message on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" }));
    const result = await wordpressProvider.verifyCredentials("https://example.com", "admin", "wrong");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("401");
  });
});

describe("wordpressProvider.applyFix", () => {
  const mockFindUnique = vi.mocked(prisma.cMSConnection.findUnique);
  const mockDecrypt = vi.mocked(decryptToken);

  beforeEach(() => {
    mockFindUnique.mockReset();
    mockDecrypt.mockReset();
    mockDecrypt.mockImplementation((v: string) => v.replace("enc-", ""));
  });

  it("throws UnsupportedFixTypeError for a fix type other than META_TITLE", async () => {
    await expect(
      wordpressProvider.applyFix("site-1", { pageUrl: "https://example.com/post", fixType: "H1", newValue: "New H1" })
    ).rejects.toThrow(UnsupportedFixTypeError);
  });

  it("throws CMSNotConnectedError when there is no connection", async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(
      wordpressProvider.applyFix("site-1", { pageUrl: "https://example.com/post", fixType: "META_TITLE", newValue: "New Title" })
    ).rejects.toThrow(CMSNotConnectedError);
  });

  it("throws CMSNotConnectedError when status is not CONNECTED", async () => {
    mockFindUnique.mockResolvedValue(mockConnection({ status: "ERROR" }));
    await expect(
      wordpressProvider.applyFix("site-1", { pageUrl: "https://example.com/post", fixType: "META_TITLE", newValue: "New Title" })
    ).rejects.toThrow(CMSNotConnectedError);
  });

  it("returns SUCCESS and the previous title when the post is resolved and updated", async () => {
    mockFindUnique.mockResolvedValue(mockConnection());
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 42, slug: "post", title: { rendered: "Old Title" } }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 42, title: { rendered: "New Title" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 42, title: { rendered: "New Title" } }) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await wordpressProvider.applyFix("site-1", {
      pageUrl: "https://example.com/post",
      fixType: "META_TITLE",
      newValue: "New Title",
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.previousValue).toBe("Old Title");
    expect(result.verified).toBe(true);
  });

  it("returns FAILED when no post or page matches the slug", async () => {
    mockFindUnique.mockResolvedValue(mockConnection());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    const result = await wordpressProvider.applyFix("site-1", {
      pageUrl: "https://example.com/missing-post",
      fixType: "META_TITLE",
      newValue: "New Title",
    });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("Could not resolve");
  });
});
