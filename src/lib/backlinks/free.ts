import { prisma } from "@/lib/prisma";
import type { BacklinksReport } from "@/lib/backlinks/domain";

/*
 * Бесплатная «затычка» для Backlinks — включается, только когда у DataForSEO нет денег.
 * Источники:
 *   - импорт CSV: Google Search Console (Links → Export), Ahrefs Webmaster Tools, Bing, любой CSV со ссылками
 *   - Bing Webmaster API, если в .env.local есть BING_WEBMASTER_API_KEY (обновляется раз в сутки)
 * Всё хранится в таблице SiteBacklink и не стоит денег.
 */

const DAY = 24 * 60 * 60 * 1000;
const LABEL: Record<string, string> = { gsc: "GSC", bing: "Bing", ahrefs: "Ahrefs", csv: "CSV" };

const host = (u: string) => {
  try {
    return new URL(u.includes("://") ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};
const toUrl = (u: string) => (u.includes("://") ? u : `https://${u.replace(/^\/+/, "")}`);
const toDate = (s: string | undefined) => {
  if (s == null || s.trim() === "") return null;
  const t = Date.parse(s.trim());
  return Number.isNaN(t) ? null : new Date(t);
};
const toInt = (s: string | undefined) => {
  if (s == null) return null;
  const n = Number.parseInt(s.replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
};

// ---------- CSV ----------
function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const first = clean.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = { ",": first.split(",").length, ";": first.split(";").length, "\t": first.split("\t").length };
  const sep = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim().length > 0)) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim().length > 0)) rows.push(row);
  return rows;
}

function findCol(headers: string[], re: RegExp, skip: number[] = []): number {
  return headers.findIndex((h, i) => skip.includes(i) === false && re.test(h));
}

export interface ImportResult { imported: number; skipped: number; source: string; kind: "links" | "sites" | "unsupported"; message: string }

export async function importBacklinksCsv(websiteId: string, siteHost: string, text: string, fileName: string): Promise<ImportResult> {
  const rows = parseCsv(text);
  if (rows.length < 2) return { imported: 0, skipped: 0, source: "csv", kind: "unsupported", message: "The file is empty." };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const name = fileName.toLowerCase();

  const src = findCol(headers, /(^linking page$|^referring page( url)?$|^source (url|page)$|^url from$|^from url$|^backlink( url)?$|^url$|^page url$)/);
  const site = findCol(headers, /(^site$|^domain$|^source domain$|^linking site$|^referring domain$)/, [src]);
  const target = findCol(headers, /(target|linked page|url to|to url|destination)/, [src, site]);
  const anchor = findCol(headers, /anchor/);
  const date = findCol(headers, /(last crawled|first seen|last seen|first found|^date$|discovered)/);
  const count = findCol(headers, /(linking pages|incoming links|backlinks|^links$|link count)/, [src, site, target]);

  const source =
    name.includes("bing") ? "bing"
      : name.includes("ahrefs") || headers.includes("referring page url") ? "ahrefs"
        : headers.some((h) => /linking page|last crawled|linking site|^site$/.test(h)) ? "gsc"
          : "csv";

  if (src < 0 && site < 0) {
    return {
      imported: 0, skipped: rows.length - 1, source, kind: "unsupported",
      message: `No source column in ${fileName}. Use the "Latest links" or "Top linking sites" export.`,
    };
  }

  const data: {
    websiteId: string; source: string; sourceUrl: string; sourceDomain: string; targetUrl: string;
    anchor: string | null; linkCount: number | null; firstSeen: Date | null; lastSeen: Date | null;
  }[] = [];
  let skipped = 0;
  const fallbackTarget = `https://${siteHost}/`;

  for (const r of rows.slice(1)) {
    const rawSrc = src >= 0 ? (r[src] ?? "").trim() : "";
    const rawSite = site >= 0 ? (r[site] ?? "").trim() : "";
    const sourceUrl = rawSrc ? toUrl(rawSrc) : "";
    const sourceDomain = host(rawSrc || rawSite);
    if (sourceDomain.includes(".") === false || /[a-z]/.test(sourceDomain) === false || sourceDomain === siteHost || sourceDomain.endsWith("." + siteHost)) { skipped++; continue; }
    const tv = target >= 0 ? (r[target] ?? "").trim() : "";
    const seen = date >= 0 ? toDate(r[date]) : null;
    data.push({
      websiteId, source, sourceUrl, sourceDomain,
      targetUrl: tv && /[./]/.test(tv) && /^[\d,.\s]+$/.test(tv) === false ? toUrl(tv) : fallbackTarget,
      anchor: anchor >= 0 ? (r[anchor] ?? "").trim() || null : null,
      linkCount: count >= 0 ? toInt(r[count]) : null,
      firstSeen: seen, lastSeen: seen,
    });
  }

  let imported = 0;
  for (let i = 0; i < data.length; i += 1000) {
    const res = await prisma.siteBacklink.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
    imported += res.count;
  }
  const kind = src >= 0 ? "links" : "sites";
  return {
    imported, skipped: skipped + (data.length - imported), source, kind,
    message: `${LABEL[source]}: ${imported} new ${kind === "links" ? "links" : "linking sites"} from ${fileName}.`,
  };
}

// ---------- Bing Webmaster API (по желанию) ----------
async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.ok === false) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function syncBing(websiteId: string, siteUrl: string, siteHost: string): Promise<number> {
  const key = process.env.BING_WEBMASTER_API_KEY ?? "";
  if (key === "") return 0;
  const last = await prisma.siteBacklink.findFirst({ where: { websiteId, source: "bing" }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
  if (last && Date.now() - last.updatedAt.getTime() < DAY) return 0;

  const base = "https://ssl.bing.com/webmaster/api.svc/json";
  const q = (m: string, extra: string) => `${base}/${m}?siteUrl=${encodeURIComponent(siteUrl)}${extra}&apikey=${encodeURIComponent(key)}`;
  const counts = await getJson(q("GetLinkCounts", "&page=0"));
  const d = (counts?.d ?? {}) as Record<string, unknown>;
  const pages = ((d.Links ?? d.Details ?? []) as { Url?: string; Count?: number }[]).filter((p) => p.Url).slice(0, 25);

  let added = 0;
  for (const p of pages) {
    const res = await getJson(q("GetUrlLinks", `&link=${encodeURIComponent(String(p.Url))}&page=0`));
    const dd = (res?.d ?? {}) as Record<string, unknown>;
    const links = (dd.Details ?? dd.Links ?? []) as { Url?: string; AnchorText?: string }[];
    const rows = links
      .filter((l) => l.Url)
      .map((l) => ({
        websiteId, source: "bing", sourceUrl: String(l.Url), sourceDomain: host(String(l.Url)), targetUrl: String(p.Url),
        anchor: l.AnchorText ? String(l.AnchorText) : null, linkCount: null, firstSeen: null, lastSeen: new Date(),
      }))
      .filter((r) => r.sourceDomain.includes(".") && r.sourceDomain === siteHost === false);
    if (rows.length) added += (await prisma.siteBacklink.createMany({ data: rows, skipDuplicates: true })).count;
  }
  await prisma.siteBacklink.updateMany({ where: { websiteId, source: "bing" }, data: { lastSeen: new Date() } });
  if (pages.length) console.log(`[backlinks free] bing: ${added} new links from ${pages.length} pages`);
  return added;
}

// ---------- отчёт в формате страницы Backlinks ----------
export async function freeBacklinksReport(websiteId: string, domain: string, siteUrl: string, reason: string): Promise<BacklinksReport> {
  await syncBing(websiteId, siteUrl, domain).catch((e: Error) => console.warn("[backlinks free] bing failed:", e.message));
  const rows = await prisma.siteBacklink.findMany({ where: { websiteId }, orderBy: { createdAt: "desc" }, take: 20000 });

  const recent = Date.now() - 30 * DAY;
  const links: BacklinksReport["links"] = rows
    .filter((r) => r.sourceUrl.length > 0)
    .map((r) => {
      const seen = r.firstSeen ?? r.lastSeen;
      return {
        from: r.sourceUrl, fromDomain: r.sourceDomain, title: null, to: r.targetUrl, anchor: r.anchor,
        dofollow: false, rank: null, firstSeen: seen ? seen.toISOString() : null,
        isNew: seen ? seen.getTime() > recent : false, isLost: false, source: LABEL[r.source] ?? "CSV",
      };
    });

  const byDomain = new Map<string, { urls: number; reported: number; first: Date | null }>();
  for (const r of rows) {
    const e = byDomain.get(r.sourceDomain) ?? { urls: 0, reported: 0, first: null };
    if (r.sourceUrl) e.urls += 1;
    if (r.linkCount) e.reported = Math.max(e.reported, r.linkCount);
    const seen = r.firstSeen ?? r.lastSeen;
    if (seen && (e.first == null || seen < e.first)) e.first = seen;
    byDomain.set(r.sourceDomain, e);
  }
  const domains: BacklinksReport["domains"] = [...byDomain.entries()]
    .map(([d, e]) => ({ domain: d, rank: null, backlinks: Math.max(e.urls, e.reported) || null, firstSeen: e.first ? e.first.toISOString() : null, spamScore: null }))
    .sort((a, b) => (b.backlinks ?? 0) - (a.backlinks ?? 0));

  const byAnchor = new Map<string, { n: number; d: Set<string> }>();
  for (const l of links) {
    const a = l.anchor || "(empty)";
    const e = byAnchor.get(a) ?? { n: 0, d: new Set<string>() };
    e.n += 1;
    e.d.add(l.fromDomain);
    byAnchor.set(a, e);
  }
  const anchors: BacklinksReport["anchors"] = [...byAnchor.entries()]
    .map(([a, e]) => ({ anchor: a, backlinks: e.n, domains: e.d.size, firstSeen: null }))
    .sort((a, b) => (b.backlinks ?? 0) - (a.backlinks ?? 0))
    .slice(0, 200);

  const totalLinks = Math.max(links.length, domains.reduce((n, d) => n + (d.backlinks ?? 0), 0));
  const used = [...new Set(rows.map((r) => LABEL[r.source] ?? "CSV"))];
  const notice = rows.length
    ? `Free mode — ${reason} Showing ${domains.length} linking sites from ${used.join(", ")}. Import fresh exports any time.`
    : `Free mode — ${reason} Import your links for free: Search Console → Links → Export external links → Download CSV (Ahrefs Webmaster Tools and Bing exports work too).`;

  return {
    domain, generatedAt: new Date().toISOString(), mode: "free", notice,
    summary: { rank: null, backlinks: totalLinks || null, referringDomains: domains.length || null, referringIps: null, brokenBacklinks: null, spamScore: null, dofollowShare: null },
    domains, links, anchors,
  };
}
