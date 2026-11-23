import { withFreshData } from "@/lib/dataforseo/fresh";

const BASE = "https://api.dataforseo.com/v3/backlinks";
type Rec = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : null);

export class BacklinksAccessError extends Error {}
export class BacklinksPaymentError extends BacklinksAccessError {}

async function call(endpoint: string, task: Rec): Promise<Rec[]> {
  const login = process.env.DATAFORSEO_LOGIN ?? "";
  const password = process.env.DATAFORSEO_PASSWORD ?? "";
  if (login === "" || password === "") throw new BacklinksAccessError("DataForSEO credentials are not configured.");
  const res = await fetch(`${BASE}/${endpoint}/live`, {
    method: "POST",
    signal: AbortSignal.timeout(60000),
    headers: { Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify([task]),
  });
  const json = (await res.json().catch(() => ({}))) as Rec;
  const t = ((json.tasks as Rec[] | undefined) ?? [])[0] ?? {};
  const code = num(t.status_code) ?? num(json.status_code) ?? 0;
  if (code === 40200) throw new BacklinksPaymentError(str(json.status_message) ?? "DataForSEO balance is empty. Top up at app.dataforseo.com, then press Refresh.");
  if (code === 40204 || code === 40201 || code === 40104) throw new BacklinksAccessError("Your DataForSEO plan does not include the Backlinks API. Activate it in the DataForSEO dashboard.");
  if (code >= 40000) throw new Error(str(t.status_message) ?? str(json.status_message) ?? `DataForSEO error ${code}`);
  return (t.result as Rec[] | undefined) ?? [];
}

/*
 * Backlinks are billed per row returned. Pulling every link (up to 20,000 rows in 40 requests) cost ~$1.20 a domain
 * each time. The page now shows the strongest 200 links and domains; the totals still count everything.
 * Saved for the days set in Settings → Data, so opening the page again costs nothing.
 */
const LIST = 200;

export interface BacklinksReport {
  domain: string; generatedAt: string; mode?: "paid" | "free"; notice?: string;
  summary: { rank: number | null; backlinks: number | null; referringDomains: number | null; referringIps: number | null; brokenBacklinks: number | null; spamScore: number | null; dofollowShare: number | null };
  domains: { domain: string; rank: number | null; backlinks: number | null; firstSeen: string | null; spamScore: number | null }[];
  links: { from: string; fromDomain: string; title: string | null; to: string; anchor: string | null; dofollow: boolean; rank: number | null; firstSeen: string | null; isNew: boolean; isLost: boolean; source?: string }[];
  anchors: { anchor: string; backlinks: number | null; domains: number | null; firstSeen: string | null }[];
}

async function build(domain: string): Promise<BacklinksReport> {
  const target = { target: domain, include_subdomains: true };
  const [summary, refDomains, backlinks, anchors] = await Promise.all([
    call("summary", { ...target, internal_list_limit: 1 }),
    call("referring_domains", { ...target, limit: LIST, order_by: ["rank,desc"] }),
    call("backlinks", { ...target, mode: "as_is", limit: LIST, order_by: ["rank,desc"] }),
    call("anchors", { ...target, limit: 100, order_by: ["backlinks,desc"] }),
  ]);
  const s = summary[0] ?? {};
  const attrs = (s.referring_links_attributes ?? null) as Rec | null;
  const items = (r: Rec[]) => ((r[0]?.items as Rec[] | undefined) ?? []);
  const links = items(backlinks).map((x) => ({
    from: str(x.url_from) ?? "", fromDomain: str(x.domain_from) ?? "", title: str(x.page_from_title), to: str(x.url_to) ?? "",
    anchor: str(x.anchor), dofollow: x.dofollow === true, rank: num(x.rank), firstSeen: str(x.first_seen),
    isNew: x.is_new === true, isLost: x.is_lost === true,
  }));
  const total = num(s.backlinks);
  const nofollow = attrs ? num(attrs.nofollow) : null;
  const domains = items(refDomains).map((x) => ({ domain: str(x.domain) ?? "", rank: num(x.rank), backlinks: num(x.backlinks), firstSeen: str(x.first_seen), spamScore: num(x.backlinks_spam_score) }));
  const capped = (total ?? 0) > links.length || (num(s.referring_domains) ?? 0) > domains.length;
  return {
    domain, generatedAt: new Date().toISOString(), mode: "paid",
    notice: capped ? `Showing the ${LIST} strongest links and referring domains. Totals include all of them.` : undefined,
    summary: {
      rank: num(s.rank), backlinks: total, referringDomains: num(s.referring_domains), referringIps: num(s.referring_ips),
      brokenBacklinks: num(s.broken_backlinks), spamScore: num(s.backlinks_spam_score),
      dofollowShare: total && nofollow !== null ? Math.round(((total - nofollow) / total) * 100) : links.length ? Math.round((links.filter((l) => l.dofollow).length / links.length) * 100) : null,
    },
    domains,
    links,
    anchors: items(anchors).map((x) => ({ anchor: str(x.anchor) ?? "(empty)", backlinks: num(x.backlinks), domains: num(x.referring_domains), firstSeen: str(x.first_seen) })),
  };
}

/** refresh = the Refresh button: buy new data even if a saved answer is still fresh. */
export async function getDomainBacklinks(domain: string, refresh = false): Promise<BacklinksReport> {
  return refresh ? withFreshData(() => build(domain)) : build(domain);
}
