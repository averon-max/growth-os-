import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/integrations/token-crypto";
import type { CMSProvider } from "./provider";
import { CMSNotConnectedError, PostResolutionError, UnsupportedFixTypeError, SUPPORTED_FIX_TYPES } from "./provider";
import type { CMSConnectionInfo, ApplyFixRequest, ApplyFixResult } from "./types";

const WP_API_TIMEOUT_MS = 15000;

interface WPPostSummary {
  id: number;
  slug: string;
  title: { rendered: string };
}

function extractSlug(pageUrl: string): string {
  const url = new URL(pageUrl);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

async function wpFetch<T>(siteUrl: string, path: string, auth: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WP_API_TIMEOUT_MS);

  try {
    const res = await fetch(`${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`WordPress API error ${res.status}: ${body.slice(0, 300)}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolvePost(siteUrl: string, auth: string, pageUrl: string): Promise<{ id: number; type: "posts" | "pages"; currentTitle: string }> {
  const slug = extractSlug(pageUrl);
  if (!slug) {
    throw new PostResolutionError(pageUrl);
  }

  for (const type of ["posts", "pages"] as const) {
    const results = await wpFetch<WPPostSummary[]>(siteUrl, `/${type}?slug=${encodeURIComponent(slug)}`, auth);
    if (results.length > 0) {
      return { id: results[0].id, type, currentTitle: results[0].title.rendered };
    }
  }

  throw new PostResolutionError(pageUrl);
}

async function getConnection(websiteId: string) {
  const connection = await prisma.cMSConnection.findUnique({ where: { websiteId } });
  if (!connection || connection.status !== "CONNECTED") {
    throw new CMSNotConnectedError();
  }
  if (!connection.usernameRef) {
    throw new CMSNotConnectedError("WordPress connection is missing a username");
  }
  return { ...connection, usernameRef: connection.usernameRef };
}

function buildAuthHeader(usernameRef: string, credentialRef: string): string {
  const username = decryptToken(usernameRef);
  const password = decryptToken(credentialRef);
  return Buffer.from(`${username}:${password}`).toString("base64");
}

export const wordpressProvider: CMSProvider = {
  cmsType: "WORDPRESS",

  async getConnectionInfo(websiteId: string): Promise<CMSConnectionInfo> {
    const connection = await prisma.cMSConnection.findUnique({ where: { websiteId } });
    if (!connection) {
      return { cmsType: "WORDPRESS", status: "DISCONNECTED", siteUrl: "", lastConnectedAt: null, lastError: null };
    }
    return {
      cmsType: "WORDPRESS",
      status: connection.status,
      siteUrl: connection.siteUrl,
      lastConnectedAt: connection.lastConnectedAt,
      lastError: connection.lastError,
    };
  },

  async verifyCredentials(siteUrl: string, username: string, password: string): Promise<{ valid: boolean; error: string | null }> {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    try {
      await wpFetch(siteUrl, "/users/me", auth);
      return { valid: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown WordPress API error";
      return { valid: false, error: message };
    }
  },

  async applyFix(websiteId: string, request: ApplyFixRequest): Promise<ApplyFixResult> {
    if (!SUPPORTED_FIX_TYPES.includes(request.fixType)) {
      throw new UnsupportedFixTypeError(request.fixType);
    }

    const connection = await getConnection(websiteId);
    const auth = buildAuthHeader(connection.usernameRef, connection.credentialRef);

    try {
      const post = await resolvePost(connection.siteUrl, auth, request.pageUrl);

      await wpFetch(connection.siteUrl, `/${post.type}/${post.id}`, auth, {
        method: "POST",
        body: JSON.stringify({ title: request.newValue }),
      });

      const refetched = await wpFetch<WPPostSummary>(connection.siteUrl, `/${post.type}/${post.id}`, auth);
      const verified = refetched.title.rendered === request.newValue;

      return { status: "SUCCESS", previousValue: post.currentTitle, errorMessage: null, verified };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown WordPress API error";
      return { status: "FAILED", previousValue: null, errorMessage: message, verified: false };
    }
  },

  async publishContent(websiteId, request) {
    const connection = await getConnection(websiteId);
    const auth = buildAuthHeader(connection.usernameRef, connection.credentialRef);

    try {
      const created = await wpFetch<{ id: number; link: string }>(connection.siteUrl, "/posts", auth, {
        method: "POST",
        body: JSON.stringify({
          title: request.title,
          content: request.bodyMarkdown,
          status: "publish",
        }),
      });

      return { status: "SUCCESS", publishedUrl: created.link, errorMessage: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown WordPress API error";
      return { status: "FAILED", publishedUrl: null, errorMessage: message };
    }
  },
};
