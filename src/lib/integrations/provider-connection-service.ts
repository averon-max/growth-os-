import { prisma } from "@/lib/prisma";
import { encryptToken } from "./token-crypto";
import type { ExchangedTokens } from "./google/oauth-client";

/**
 * Upserts a ProviderConnection for GOOGLE_SEARCH_CONSOLE. Tokens are
 * encrypted before they touch the database — accessTokenRef/refreshTokenRef
 * are ciphertext, never raw tokens. Idempotent: safe to call repeatedly
 * for the same workspace (e.g. user re-authorizes).
 */
export async function upsertGoogleSearchConsoleConnection(
  workspaceId: string,
  tokens: ExchangedTokens
) {
  const accessTokenRef = encryptToken(tokens.accessToken);
  const refreshTokenRef = tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined;

  return prisma.providerConnection.upsert({
    where: {
      workspaceId_provider: { workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" },
    },
    create: {
      workspaceId,
      provider: "GOOGLE_SEARCH_CONSOLE",
      status: "CONNECTED",
      accessTokenRef,
      refreshTokenRef: refreshTokenRef ?? null,
      expiresAt: tokens.expiresAt,
    },
    update: {
      status: "CONNECTED",
      accessTokenRef,
      // Google only re-sends a refresh token on consent; if absent, keep the existing one.
      ...(refreshTokenRef ? { refreshTokenRef } : {}),
      expiresAt: tokens.expiresAt,
    },
  });
}
