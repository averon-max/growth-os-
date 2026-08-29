import { prisma } from "@/lib/prisma";
import { encryptToken } from "./token-crypto";
import type { ExchangedTokens } from "./google/oauth-client";

export async function upsertGoogleSearchConsoleConnection(
  workspaceId: string,
  tokens: ExchangedTokens
) {
  const accessTokenRef = encryptToken(tokens.accessToken);
  const refreshTokenRef = tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined;

  return prisma.providerConnection.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } },
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
      ...(refreshTokenRef ? { refreshTokenRef } : {}),
      expiresAt: tokens.expiresAt,
    },
  });
}

export async function upsertGoogleAnalyticsConnection(
  workspaceId: string,
  tokens: ExchangedTokens
) {
  const accessTokenRef = encryptToken(tokens.accessToken);
  const refreshTokenRef = tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined;

  return prisma.providerConnection.upsert({
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_ANALYTICS_4" } },
    create: {
      workspaceId,
      provider: "GOOGLE_ANALYTICS_4",
      status: "CONNECTED",
      accessTokenRef,
      refreshTokenRef: refreshTokenRef ?? null,
      expiresAt: tokens.expiresAt,
    },
    update: {
      status: "CONNECTED",
      accessTokenRef,
      ...(refreshTokenRef ? { refreshTokenRef } : {}),
      expiresAt: tokens.expiresAt,
    },
  });
}
