import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { upsertCloudflareConnection } from "@/lib/integrations/cloudflare/connection-service";

const API = "https://api.cloudflare.com/client/v4";
type Zone = { id: string; name: string; status?: string };

const host = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").toLowerCase(); }
};

async function cf<T>(path: string, token: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; message: string }> {
  try {
    const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { success?: boolean; result?: T; data?: T; errors?: { message?: string }[] } | null;
    const message = json?.errors?.map((e) => e.message).filter(Boolean).join("; ") ?? "";
    return { ok: res.ok && json?.success !== false, status: res.status, data: (json?.result ?? json?.data ?? null) as T | null, message };
  } catch (e) {
    return { ok: false, status: 0, data: null, message: (e as Error).message };
  }
}

/** The Cloudflare zone that serves this website: exact name, or the parent domain of a subdomain. */
async function findZone(token: string, siteHost: string): Promise<{ zone: Zone | null; canList: boolean }> {
  const parts = siteHost.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const name = parts.slice(i).join(".");
    const r = await cf<Zone[]>(`/zones?name=${encodeURIComponent(name)}&per_page=5`, token);
    if (!r.ok) return { zone: null, canList: false };
    if (r.data && r.data.length > 0) return { zone: r.data[0], canList: true };
  }
  return { zone: null, canList: true };
}

/** One tiny analytics query: proves the token can read this zone's statistics. */
async function canReadAnalytics(token: string, zoneId: string): Promise<{ ok: boolean; message: string }> {
  const since = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const query = `query($z: string!, $d: Date!) { viewer { zones(filter: { zoneTag: $z }) { httpRequests1dGroups(limit: 1, filter: { date_geq: $d }) { sum { requests } } } } }`;
  const r = await cf<{ viewer?: { zones?: unknown[] } }>("/graphql", token, { method: "POST", body: JSON.stringify({ query, variables: { z: zoneId, d: since } }) });
  if (r.status === 403 || /authz|permission|not authorized/i.test(r.message)) return { ok: false, message: "The token can't read analytics. Create it with the Analytics: Read permission." };
  if (!r.data?.viewer?.zones || r.data.viewer.zones.length === 0) return { ok: false, message: r.message || "Cloudflare returned no data for this zone. Check that the token includes this site." };
  return { ok: true, message: "" };
}

/** GET ?websiteId= — whether this website has Cloudflare connected. The token is never returned. */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    if (!websiteId) return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
    await requireWebsiteAccess(user.id, websiteId);
    const c = await prisma.cloudflareConnection.findUnique({ where: { websiteId }, select: { zoneId: true, updatedAt: true } });
    return NextResponse.json(c ? { connected: true, zoneId: c.zoneId, updatedAt: c.updatedAt } : { connected: false });
  } catch (error) {
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/**
 * POST { websiteId, apiToken, zoneId? } — checks the token, finds the zone for the website's domain
 * (or uses the Zone ID given), checks it can read analytics, then saves it encrypted.
 */
export async function POST(req: NextRequest) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { websiteId?: string; apiToken?: string; zoneId?: string };
    const websiteId = String(body.websiteId ?? "");
    const apiToken = String(body.apiToken ?? "").trim();
    let zoneId = String(body.zoneId ?? "").trim();
    if (!websiteId || !apiToken) return NextResponse.json({ error: "Paste your Cloudflare API token." }, { status: 400 });
    if (!/^[A-Za-z0-9_-]{30,}$/.test(apiToken)) return NextResponse.json({ error: "That doesn't look like a Cloudflare API token. Copy the token shown right after you create it." }, { status: 400 });
    if (zoneId && !/^[a-f0-9]{32}$/i.test(zoneId)) return NextResponse.json({ error: "A Zone ID is 32 letters and digits — copy it from the site's Overview page in Cloudflare." }, { status: 400 });

    const website = await requireWebsiteAccess(user.id, websiteId);
    const siteHost = host((website as { url?: string }).url ?? "");
    let zoneName = "";

    if (!zoneId) {
      const { zone, canList } = await findZone(apiToken, siteHost);
      if (!canList) return NextResponse.json({ error: "Cloudflare didn't accept this token, or it can't see your sites. Create a new token with the button above (it has the right permissions).", needsZoneId: true }, { status: 400 });
      if (!zone) return NextResponse.json({ error: `No Cloudflare site matches ${siteHost}. Make sure the token includes it, or paste the site's Zone ID.`, needsZoneId: true }, { status: 400 });
      zoneId = zone.id;
      zoneName = zone.name;
    }

    const analytics = await canReadAnalytics(apiToken, zoneId);
    if (!analytics.ok) return NextResponse.json({ error: analytics.message }, { status: 400 });

    await upsertCloudflareConnection(websiteId, zoneId, apiToken);
    return NextResponse.json({ ok: true, zoneId, zoneName: zoneName || siteHost });
  } catch (error) {
    console.error("Cloudflare connect error:", (error as Error).message);
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

/** DELETE ?websiteId= — disconnects Cloudflare and deletes the saved token and traffic history for this website. */
export async function DELETE(req: NextRequest) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    if (!websiteId) return NextResponse.json({ error: "websiteId is required" }, { status: 400 });
    await requireWebsiteAccess(user.id, websiteId);
    await prisma.$transaction([
      prisma.trafficSnapshot.deleteMany({ where: { connection: { websiteId } } }),
      prisma.pageTrafficSnapshot.deleteMany({ where: { connection: { websiteId } } }),
      prisma.cloudflareConnection.deleteMany({ where: { websiteId } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
