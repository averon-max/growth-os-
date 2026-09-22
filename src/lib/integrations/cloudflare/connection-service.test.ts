import { describe, it, expect, vi, beforeEach } from "vitest";

const { upsertMock, findUniqueMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    cloudflareConnection: {
      upsert: upsertMock,
      findUnique: findUniqueMock,
    },
  },
}));

import {
  upsertCloudflareConnection,
  getCloudflareConnectionWithToken,
} from "./connection-service";
import { decryptToken } from "@/lib/integrations/token-crypto";

describe("Cloudflare connection service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("encrypts the API token before storing it", async () => {
    const plaintext = "super-secret-token";

    upsertMock.mockResolvedValue({
      id: "connection1",
      websiteId: "site1",
      zoneId: "zone1",
      apiTokenEncrypted: "stored-value",
    });

    await upsertCloudflareConnection("site1", "zone1", plaintext);

    expect(upsertMock).toHaveBeenCalledTimes(1);

    const call = upsertMock.mock.calls[0][0];

    expect(call.create.websiteId).toBe("site1");
    expect(call.create.zoneId).toBe("zone1");
    expect(call.create.apiTokenEncrypted).not.toBe(plaintext);
    expect(call.create.apiTokenEncrypted).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(decryptToken(call.create.apiTokenEncrypted)).toBe(plaintext);

    expect(JSON.stringify(call)).not.toContain(plaintext);
  });

  it("encrypts the token when updating an existing connection", async () => {
    const plaintext = "updated-secret-token";

    upsertMock.mockResolvedValue({
      id: "connection1",
      websiteId: "site1",
      zoneId: "zone2",
      apiTokenEncrypted: "stored-value",
    });

    await upsertCloudflareConnection("site1", "zone2", plaintext);

    const call = upsertMock.mock.calls[0][0];

    expect(call.update.zoneId).toBe("zone2");
    expect(call.update.apiTokenEncrypted).not.toBe(plaintext);
    expect(decryptToken(call.update.apiTokenEncrypted)).toBe(plaintext);
  });

  it("returns null when no Cloudflare connection exists", async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await getCloudflareConnectionWithToken("site1");

    expect(result).toBeNull();
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { websiteId: "site1" },
    });
  });

  it("decrypts the stored token only for server-side use", async () => {
    const plaintext = "super-secret-token";

    const { encryptToken } = await import("@/lib/integrations/token-crypto");
    const encrypted = encryptToken(plaintext);

    findUniqueMock.mockResolvedValue({
      id: "connection1",
      websiteId: "site1",
      zoneId: "zone1",
      apiTokenEncrypted: encrypted,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getCloudflareConnectionWithToken("site1");

    expect(result).not.toBeNull();
    expect(result?.apiToken).toBe(plaintext);
    expect(result?.apiTokenEncrypted).toBe(encrypted);
    expect(result?.apiTokenEncrypted).not.toBe(plaintext);
  });

  it("uses a unique ciphertext for repeated encryption", async () => {
    const plaintext = "same-secret-token";

    upsertMock.mockResolvedValue({});

    await upsertCloudflareConnection("site1", "zone1", plaintext);
    await upsertCloudflareConnection("site1", "zone1", plaintext);

    const first = upsertMock.mock.calls[0][0].create.apiTokenEncrypted;
    const second = upsertMock.mock.calls[1][0].create.apiTokenEncrypted;

    expect(first).not.toBe(second);
    expect(decryptToken(first)).toBe(plaintext);
    expect(decryptToken(second)).toBe(plaintext);
  });
});
