import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/integrations/token-crypto";
import { createGoogleOAuthClient } from "@/lib/integrations/google/oauth-client";
import type {
  KeywordData,
  SnapshotData,
  KeywordProvenance,
  ProviderConnectionStatus,
} from "./types";
import type { KeywordProvider, SearchConsoleRow } from "./provider";
import { normalizeKeyword } from "./normalize";

const GSC_ROW_LIMIT = 25000;
const DEFAULT_DEVICE = "DESKTOP";
const DEFAULT_COUNTRY = "us";

export class ProviderNotConnectedError extends Error {
  constructor(message = "Google Search Console is not connected for this workspace") {
    super(message);
    this.name = "ProviderNotConnectedError";
  }
}

async function persistRefreshedTokens(
  workspaceId: string,
  accessToken?: string | null,
  refreshToken?: string | null,
  expiryDate?: number | null
) {
  if (!accessToken) return;
  await prisma.providerConnection.update({
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } },
    data: {
      accessTokenRef: encryptToken(accessToken),
      ...(refreshToken ? { refreshTokenRef: encryptToken(refreshToken) } : {}),
      expiresAt: expiryDate ? new Date(expiryDate) : null,
      status: "CONNECTED",
    },
  });
}

async function getAuthorizedClient(workspaceId: string) {
  const connection = await prisma.providerConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } },
  });

  if (!connection || connection.status !== "CONNECTED" || !connection.accessTokenRef) {
    throw new ProviderNotConnectedError();
  }

  const oauth2Client = createGoogleOAuthClient();
  const accessToken = decryptToken(connection.accessTokenRef);
  const refreshToken = connection.refreshTokenRef ? decryptToken(connection.refreshTokenRef) : undefined;

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.expiresAt ? connection.expiresAt.getTime() : undefined,
  });

  // Persist tokens if googleapis rotates them mid-request.
  oauth2Client.on("tokens", (tokens) => {
    void persistRefreshedTokens(workspaceId, tokens.access_token, tokens.refresh_token, tokens.expiry_date);
  });

  const isExpired = connection.expiresAt ? connection.expiresAt.getTime() <= Date.now() : false;
  if (isExpired && refreshToken) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await persistRefreshedTokens(
      workspaceId,
      credentials.access_token,
      credentials.refresh_token,
      credentials.expiry_date
    );
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const gscProvider: KeywordProvider = {
  providerType: "GOOGLE_SEARCH_CONSOLE",

  async getConnectionStatus(workspaceId: string): Promise<ProviderConnectionStatus> {
    const connection = await prisma.providerConnection.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } },
    });
    if (!connection) {
      return { provider: "GOOGLE_SEARCH_CONSOLE", status: "DISCONNECTED" };
    }
    return {
      provider: "GOOGLE_SEARCH_CONSOLE",
      status: connection.status as ProviderConnectionStatus["status"],
      expiresAt: connection.expiresAt ?? undefined,
    };
  },

  async fetchSearchPerformance(options): Promise<SearchConsoleRow[]> {
    const { workspaceId, siteUrl, startDate, endDate, device, country } = options;
    const auth = await getAuthorizedClient(workspaceId);
    const searchconsole = google.searchconsole({ version: "v1", auth });

    const rows: SearchConsoleRow[] = [];
    let startRow = 0;

    for (;;) {
      const filters: { dimension: string; operator: string; expression: string }[] = [];
      if (device) filters.push({ dimension: "device", operator: "equals", expression: device });
      if (country) filters.push({ dimension: "country", operator: "equals", expression: country });

      const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["query", "page", "date", "device", "country"],
          rowLimit: GSC_ROW_LIMIT,
          startRow,
          ...(filters.length > 0 ? { dimensionFilterGroups: [{ filters }] } : {}),
        },
      });

      const batch = response.data.rows ?? [];
      for (const row of batch) {
        const [query, page, date, rowDevice, rowCountry] = row.keys ?? [];
        if (!query || !page || !date) continue;
        rows.push({
          keyword: query,
          page,
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
          date: new Date(date),
          device: (rowDevice ?? DEFAULT_DEVICE).toUpperCase(),
          country: (rowCountry ?? DEFAULT_COUNTRY).toLowerCase(),
        });
      }

      if (batch.length < GSC_ROW_LIMIT) break;
      startRow += GSC_ROW_LIMIT;
    }

    return rows;
  },

  normalizeRows(
    rows: SearchConsoleRow[],
    provenance: KeywordProvenance
  ): Array<{ keyword: KeywordData; snapshot: SnapshotData }> {
    return rows.map((row) => ({
      keyword: {
        text: row.keyword,
        normalized: normalizeKeyword(row.keyword),
      },
      snapshot: {
        date: row.date,
        position: row.position,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        device: row.device,
        country: row.country,
        source: provenance.provider,
        retrievedAt: provenance.retrievedAt,
      },
    }));
  },
};
