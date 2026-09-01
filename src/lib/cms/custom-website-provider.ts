import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";
import type { CMSProvider } from "./provider";
import { CMSNotConnectedError, PostResolutionError, UnsupportedFixTypeError, SUPPORTED_FIX_TYPES } from "./provider";
import type { CMSConnectionInfo, ApplyFixRequest, ApplyFixResult, FixType } from "./types";

const API_TIMEOUT_MS = 15000;

const FIX_TYPE_TO_FIELD: Record<FixType, string> = {
  META_TITLE: "title",
  META_DESCRIPTION: "metaDescription",
  H1: "h1",
  ALT_TEXT: "altText",
  CANONICAL: "canonical",
  INTERNAL_LINK: "internalLinks",
  CONTENT: "content",
};

interface IntegrationPage {
  id: string;
  url: string;
  title: string;
  metaDescription: string | null;
  h1: string | null;
}

interface IntegrationPagesResponse {
  pages: IntegrationPage[];
}

interface IntegrationVerifyResponse {
  ok: boolean;
}

async function integrationFetch<T>(apiBaseUrl: string, path: string, apiKey: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/growth-os${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Integration API error ${res.status}: ${body.slice(0, 300)}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUrlPath(pageUrl: string): string {
  return new URL(pageUrl).pathname;
}

async function resolvePage(apiBaseUrl: string, apiKey: string, pageUrl: string): Promise<IntegrationPage> {
  const targetPath = normalizeUrlPath(pageUrl);
  const { pages } = await integrationFetch<IntegrationPagesResponse>(apiBaseUrl, "/pages", apiKey);
  const match = pages.find((p) => normalizeUrlPath(p.url) === targetPath);
  if (!match) {
    throw new PostResolutionError(pageUrl);
  }
  return match;
}

async function getConnection(websiteId: string) {
  const connection = await prisma.cMSConnection.findUnique({ where: { websiteId } });
  if (!connection || connection.status !== "CONNECTED") {
    throw new CMSNotConnectedError();
  }
  return connection;
}

export const customWebsiteProvider: CMSProvider = {
  cmsType: "CUSTOM_API",

  async getConnectionInfo(websiteId: string): Promise<CMSConnectionInfo> {
    const connection = await prisma.cMSConnection.findUnique({ where: { websiteId } });
    if (!connection) {
      return { cmsType: "CUSTOM_API", status: "DISCONNECTED", siteUrl: "", lastConnectedAt: null, lastError: null };
    }
    return {
      cmsType: "CUSTOM_API",
      status: connection.status,
      siteUrl: connection.siteUrl,
      lastConnectedAt: connection.lastConnectedAt,
      lastError: connection.lastError,
    };
  },

  async verifyCredentials(apiBaseUrl: string, _username: string, apiKey: string): Promise<{ valid: boolean; error: string | null }> {
    try {
      const result = await integrationFetch<IntegrationVerifyResponse>(apiBaseUrl, "/verify", apiKey, { method: "POST" });
      if (!result.ok) {
        return { valid: false, error: "Integration API reported the connection as invalid." };
      }
      return { valid: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown integration API error";
      return { valid: false, error: message };
    }
  },

  async applyFix(websiteId: string, request: ApplyFixRequest): Promise<ApplyFixResult> {
    if (!SUPPORTED_FIX_TYPES.includes(request.fixType)) {
      throw new UnsupportedFixTypeError(request.fixType);
    }

    const connection = await getConnection(websiteId);
    const apiKey = decryptToken(connection.credentialRef);

    try {
      const page = await resolvePage(connection.siteUrl, apiKey, request.pageUrl);
      const field = FIX_TYPE_TO_FIELD[request.fixType];
      const previousValue = field === "title" ? page.title : field === "metaDescription" ? page.metaDescription : page.h1;

      await integrationFetch(connection.siteUrl, `/pages/${page.id}`, apiKey, {
        method: "PATCH",
        body: JSON.stringify({ [field]: request.newValue }),
      });

      const refetched = await integrationFetch<IntegrationPage>(connection.siteUrl, `/pages/${page.id}`, apiKey);
      const refetchedValue = field === "title" ? refetched.title : field === "metaDescription" ? refetched.metaDescription : refetched.h1;
      const verified = refetchedValue === request.newValue;

      return { status: "SUCCESS", previousValue: previousValue ?? null, errorMessage: null, verified };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown integration API error";
      return { status: "FAILED", previousValue: null, errorMessage: message, verified: false };
    }
  },

  async publishContent(websiteId, request) {
    const connection = await getConnection(websiteId);
    const apiKey = decryptToken(connection.credentialRef);

    try {
      const created = await integrationFetch<{ id: string; url: string }>(connection.siteUrl, "/articles", apiKey, {
        method: "POST",
        body: JSON.stringify({
          title: request.title,
          metaDescription: request.metaDescription,
          h1: request.h1,
          bodyMarkdown: request.bodyMarkdown,
          publish: true,
        }),
      });

      return { status: "SUCCESS", publishedUrl: created.url, errorMessage: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown integration API error";
      return { status: "FAILED", publishedUrl: null, errorMessage: message };
    }
  },
};
