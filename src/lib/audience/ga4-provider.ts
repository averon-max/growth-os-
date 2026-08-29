import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/integrations/token-crypto";
import { createGoogleOAuthClient } from "@/lib/integrations/google/oauth-client";
import type { AudienceProvider } from "./provider";
import type {
  AudienceConnectionStatus,
  FetchAudienceParams,
  NormalizedAudienceSegment,
  RawAudienceRow,
} from "./types";

const GA4_ROW_LIMIT = 100000;
const GA4_RUN_REPORT_URL_BASE = "https://analyticsdata.googleapis.com/v1beta";

export class ProviderNotConnectedError extends Error {
  constructor(message = "Google Analytics is not connected for this workspace") {
    super(message);
    this.name = "ProviderNotConnectedError";
  }
}

interface GA4DimensionValue {
  value?: string;
}

interface GA4MetricValue {
  value?: string;
}

interface GA4ReportRow {
  dimensionValues?: GA4DimensionValue[];
  metricValues?: GA4MetricValue[];
}

interface GA4RunReportResponse {
  rows?: GA4ReportRow[];
}

async function persistRefreshedTokens(
  workspaceId: string,
  accessToken?: string | null,
  refreshToken?: string | null,
  expiryDate?: number | null
) {
  if (!accessToken) return;
  await prisma.providerConnection.update({
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_ANALYTICS_4" } },
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
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_ANALYTICS_4" } },
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

export const ga4Provider: AudienceProvider = {
  async getConnectionStatus(workspaceId: string): Promise<AudienceConnectionStatus> {
    const connection = await prisma.providerConnection.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_ANALYTICS_4" } },
    });
    if (!connection) {
      return { provider: "GOOGLE_ANALYTICS_4", status: "DISCONNECTED" };
    }
    return {
      provider: "GOOGLE_ANALYTICS_4",
      status: connection.status as AudienceConnectionStatus["status"],
      expiresAt: connection.expiresAt ?? undefined,
    };
  },

  async fetchAudienceData(params: FetchAudienceParams): Promise<RawAudienceRow[]> {
    const { workspaceId, propertyId, startDate, endDate } = params;
    const client = await getAuthorizedClient(workspaceId);

    const rows: RawAudienceRow[] = [];
    let offset = 0;

    for (;;) {
      const res = await client.request<GA4RunReportResponse>({
        method: "POST",
        url: `${GA4_RUN_REPORT_URL_BASE}/properties/${propertyId}:runReport`,
        data: {
          dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
          dimensions: [
            { name: "date" },
            { name: "userAgeBracket" },
            { name: "deviceCategory" },
            { name: "sessionDefaultChannelGroup" },
          ],
          metrics: [{ name: "activeUsers" }],
          limit: GA4_ROW_LIMIT,
          offset,
        },
      });

      const batch = res.data.rows ?? [];
      for (const row of batch) {
        const dims = row.dimensionValues ?? [];
        const date = dims[0]?.value ?? "";
        const ageBracket = dims[1]?.value ?? "";
        const device = dims[2]?.value ?? "";
        const channel = dims[3]?.value ?? "";
        const userCount = Number(row.metricValues?.[0]?.value ?? 0);
        if (!date) continue;

        const segmentName = `${channel || "unknown"}-${device || "unknown"}`;
        rows.push({
          segmentName,
          date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
          userCount,
          criteria: { ageBracket, device, channel },
        });
      }

      if (batch.length < GA4_ROW_LIMIT) break;
      offset += GA4_ROW_LIMIT;
    }

    return rows;
  },

  normalizeSegments(rows: RawAudienceRow[]): NormalizedAudienceSegment[] {
    const bySegment = new Map<string, NormalizedAudienceSegment>();

    for (const row of rows) {
      const existing = bySegment.get(row.segmentName);
      if (existing) {
        existing.rows.push(row);
      } else {
        bySegment.set(row.segmentName, {
          name: row.segmentName,
          criteria: row.criteria,
          rows: [row],
        });
      }
    }

    return Array.from(bySegment.values());
  },
};
