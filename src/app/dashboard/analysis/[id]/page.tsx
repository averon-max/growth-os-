"use client";

import { SEVERITY } from "@/components/dashboard/insights-tokens";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronDown, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import s from "./analysis.module.css";
import { AuditKeywords } from "./audit-keywords";

interface Analysis {
  id: string;
  websiteId?: string;
  status: string;
  errorMessage: string | null;
  overallScore: number | null;
  pagesCount: number | null;
  completedAt?: string | null;
  createdAt?: string;
  website: { url: string; business: { name: string } };
  _count: { pages: number; issues: number; opportunities: number };
}
interface Issue { id: string; type: string; severity: string; pageUrl: string | null; description: string; evidence: string | null; recommendation: string }
interface Opportunity { id: string; title: string; type: string; priority: string; score: number; reason: string; recommendation: string; affectedPages: number }

type Sev = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type Group = { type: string; title: string; severity: Sev; recommendation: string; items: Issue[] };
const SEV: Sev[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const SEV_LABEL: Record<Sev, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
const SEV_TONE: Record<Sev, string> = { CRITICAL: SEVERITY.critical, HIGH: SEVERITY.high, MEDIUM: SEVERITY.medium, LOW: SEVERITY.low };
const sevOf = (v: string): Sev => (SEV.includes(v as Sev) ? (v as Sev) : "LOW");

/** Same grouping as lib/seo-engine/scoring.ts. */
const AREAS = [
  { key: "technical", name: "Technical", what: "Page titles, broken links and structured data", types: ["MISSING_TITLE", "TITLE_TOO_LONG", "TITLE_TOO_SHORT", "DUPLICATE_TITLE", "MISSING_SCHEMA", "BROKEN_INTERNAL_LINK"] },
  { key: "content", name: "Content", what: "Meta descriptions, page length and image alt text", types: ["MISSING_META_DESCRIPTION", "META_DESCRIPTION_TOO_LONG", "DUPLICATE_META_DESCRIPTION", "IMAGE_MISSING_ALT", "THIN_CONTENT"] },
  { key: "structure", name: "Structure", what: "One H1 per page and internal links to every page", types: ["MISSING_H1", "MULTIPLE_H1", "ORPHAN_PAGE"] },
  { key: "indexability", name: "Indexability", what: "Canonical tags that tell Google which URL to show", types: ["MISSING_CANONICAL"] },
];

const TYPE_LABEL: Record<string, string> = {
  MISSING_TITLE: "Missing page title",
  TITLE_TOO_LONG: "Title too long",
  TITLE_TOO_SHORT: "Title too short",
  DUPLICATE_TITLE: "Duplicate titles",
  MISSING_META_DESCRIPTION: "Missing meta description",
  META_DESCRIPTION_TOO_LONG: "Meta description too long",
  DUPLICATE_META_DESCRIPTION: "Duplicate meta descriptions",
  MISSING_H1: "Missing H1 heading",
  MULTIPLE_H1: "More than one H1",
  MISSING_CANONICAL: "Missing canonical tag",
  IMAGE_MISSING_ALT: "Images without alt text",
  THIN_CONTENT: "Thin content (under 300 words)",
  MISSING_SCHEMA: "No structured data",
  ORPHAN_PAGE: "Pages no other page links to",
  BROKEN_INTERNAL_LINK: "Broken internal links",
};
const typeLabel = (t: string, fallback: string) => TYPE_LABEL[t] ?? (fallback || t.toLowerCase().replace(/_/g, " "));

function verdict(score: number | null) {
  if (score === null) return { text: "Not scored", tone: "#707070" };
  if (score >= 90) return { text: "Good", tone: "#30a46c" };
  if (score >= 70) return { text: "Fair", tone: "#9cc46b" };
  if (score >= 50) return { text: "Needs work", tone: "#d4a94e" };
  return { text: "Poor", tone: "#e5484d" };
}
const impact = (score: number) => (score >= 80 ? { text: "High impact", tone: "#ffb224" } : score >= 60 ? { text: "Medium impact", tone: "#0090ff" } : { text: "Low impact", tone: "#8f8f8f" });
const path = (u: string) => { try { const x = new URL(u); return x.pathname + x.search || "/"; } catch { return u; } };
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const tone = (c: string) => ({ "--tone": c }) as React.CSSProperties;

/** Opportunities don't store which issues they came from, so match by type, then by the words in the title. */
const OPP_KEYWORDS: [RegExp, string][] = [
  [/broken.*link/i, "BROKEN_INTERNAL_LINK"],
  [/duplicate.*title/i, "DUPLICATE_TITLE"],
  [/missing.*title/i, "MISSING_TITLE"],
  [/title.*(long|short)/i, "TITLE_TOO_LONG"],
  [/duplicate.*meta/i, "DUPLICATE_META_DESCRIPTION"],
  [/meta description/i, "MISSING_META_DESCRIPTION"],
  [/thin|expand.*content/i, "THIN_CONTENT"],
  [/canonical/i, "MISSING_CANONICAL"],
  [/structured data|schema/i, "MISSING_SCHEMA"],
  [/alt text|image/i, "IMAGE_MISSING_ALT"],
  [/h1|heading/i, "MISSING_H1"],
  [/orphan|internal link/i, "ORPHAN_PAGE"],
];
function issuesFor(o: Opportunity, all: Issue[]): Issue[] {
  const exact = all.filter((i) => i.type === o.type);
  if (exact.length) return exact;
  const hit = OPP_KEYWORDS.find(([re]) => re.test(o.title));
  if (!hit) return [];
  const t = hit[1];
  const family = t === "TITLE_TOO_LONG" ? ["TITLE_TOO_LONG", "TITLE_TOO_SHORT"] : t === "MISSING_H1" ? ["MISSING_H1", "MULTIPLE_H1"] : [t];
  return all.filter((i) => family.includes(i.type));
}

/** A link that opens the page and, where the problem has visible text, scrolls to it and highlights it. */
function pageLink(i: Issue): string | null {
  if (!i.pageUrl) return null;
  const quoted = (i.evidence ?? "").match(/["“']([^"”']{3,80})["”']/)?.[1];
  const visible = quoted && !["MISSING_TITLE", "TITLE_TOO_LONG", "TITLE_TOO_SHORT", "DUPLICATE_TITLE", "MISSING_META_DESCRIPTION", "META_DESCRIPTION_TOO_LONG", "DUPLICATE_META_DESCRIPTION", "MISSING_CANONICAL", "MISSING_SCHEMA"].includes(i.type);
  return visible ? `${i.pageUrl.split("#")[0]}#:~:text=${encodeURIComponent(quoted!)}` : i.pageUrl;
}

/** An outside tool that shows the part of the page Google reads but visitors don't see. */
function checkTool(i: Issue): { label: string; href: string } | null {
  if (!i.pageUrl) return null;
  const u = encodeURIComponent(i.pageUrl);
  if (i.type === "MISSING_SCHEMA") return { label: "Rich results test", href: `https://search.google.com/test/rich-results?url=${u}` };
  if (/TITLE|META_DESCRIPTION|CANONICAL/.test(i.type)) return { label: "View in Google", href: `https://www.google.com/search?q=${encodeURIComponent(`site:${i.pageUrl}`)}` };
  return null;
}

function PageList({ items, limit = 50 }: { items: Issue[]; limit?: number }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (u: string) => { void navigator.clipboard?.writeText(u); setCopied(u); setTimeout(() => setCopied(null), 1500); };
  return (
    <div className={s.urls}>
      {items.slice(0, limit).map((i) => {
        const link = pageLink(i);
        const tool = checkTool(i);
        return (
          <div key={i.id} className={s.url}>
            {i.pageUrl ? <a href={link!} target="_blank" rel="noreferrer" title={i.pageUrl}>{path(i.pageUrl)}</a> : <span>Whole site</span>}
            <span title={i.evidence ?? i.description}>{i.evidence ?? i.description}</span>
            <span className={s.urlActions}>
              {i.pageUrl ? (
                <>
                  <a className={s.mini} href={link!} target="_blank" rel="noreferrer" title={link !== i.pageUrl ? "Open the page at the problem" : "Open the page"}><ExternalLink size={12} />{link !== i.pageUrl ? "Show on page" : "Open"}</a>
                  {tool ? <a className={s.mini} href={tool.href} target="_blank" rel="noreferrer">{tool.label}</a> : null}
                  <button type="button" className={s.mini} onClick={() => copy(i.pageUrl!)} aria-label="Copy page URL">{copied === i.pageUrl ? <Check size={12} /> : <Copy size={12} />}</button>
                </>
              ) : null}
            </span>
          </div>
        );
      })}
      {items.length > limit ? <div className={s.url}><span>…and {items.length - limit} more</span></div> : null}
    </div>
  );
}

function FixRow({ o, rank, items }: { o: Opportunity; rank: number; items: Issue[] }) {
  const [open, setOpen] = useState(false);
  const im = impact(o.score);
  return (
    <div className={s.fixWrap}>
      <div className={s.fix}>
        <span className={s.rank}>{rank}</span>
        <div>
          <div className={s.fixTitle}>{o.title}</div>
          <div className={s.fixWhy}>{o.reason}</div>
          <div className={s.fixHow}>{o.recommendation}</div>
          {items.length ? (
            <button type="button" className={s.showPages} aria-expanded={open} onClick={() => setOpen(!open)}>
              <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : undefined }} />
              {open ? "Hide pages" : `Show ${pl(new Set(items.map((x) => x.pageUrl ?? "site")).size, "page")}`}
            </button>
          ) : null}
        </div>
        <div className={s.fixSide}>
          <span className={s.impact} style={tone(im.tone)}>{im.text}</span>
          <div className={s.affects}>{pl(o.affectedPages, "page")}</div>
        </div>
      </div>
      {open ? <div className={s.fixPages}><PageList items={items} /></div> : null}
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Sev | "ALL">("ALL");
  const [rerun, setRerun] = useState(false);
  // Issues (the audit) or Keywords (where the site ranks + Google Trends ideas). ?view=keywords opens the second.
  const [view, setView] = useState<"issues" | "keywords">("issues");
  useEffect(() => {
    const read = () => setView(new URLSearchParams(window.location.search).get("view") === "keywords" ? "keywords" : "issues");
    read();
    window.addEventListener("popstate", read);
    window.addEventListener("hx:subnav-go", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hx:subnav-go", read);
    };
  }, []);
  const pick = (v: "issues" | "keywords") => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "keywords") url.searchParams.set("view", "keywords"); else url.searchParams.delete("view");
    window.history.replaceState(null, "", url.toString());
    window.dispatchEvent(new Event("hx:subnav"));
  };

  useEffect(() => {
    if (!id) return;
    let interval: ReturnType<typeof setInterval>;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analyses/${id}`);
        if (!res.ok) { setError("Analysis not found."); setLoading(false); clearInterval(interval); return; }
        const data = await res.json();
        setAnalysis(data.analysis);
        setLoading(false);
        if (data.analysis.status === "COMPLETED") {
          clearInterval(interval);
          const [ir, or] = await Promise.all([fetch(`/api/analyses/${id}/issues`), fetch(`/api/analyses/${id}/opportunities`)]);
          setIssues((await ir.json()).issues || []);
          setOpportunities((await or.json()).opportunities || []);
        }
        if (data.analysis.status === "FAILED") clearInterval(interval);
      } catch {
        setLoading(false);
        setError("Failed to load analysis.");
      }
    };
    void fetchData();
    interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const pages = analysis?.pagesCount ?? analysis?._count.pages ?? 0;

  const groups = useMemo((): Group[] => {
    const map = new Map<string, Group>();
    for (const i of issues) {
      const g: Group = map.get(i.type) ?? { type: i.type, title: typeLabel(i.type, i.description), severity: sevOf(i.severity), recommendation: i.recommendation, items: [] };
      if (SEV.indexOf(sevOf(i.severity)) < SEV.indexOf(g.severity)) g.severity = sevOf(i.severity);
      g.items.push(i);
      map.set(i.type, g);
    }
    return [...map.values()].sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity) || b.items.length - a.items.length);
  }, [issues]);

  const bySev = useMemo(() => Object.fromEntries(SEV.map((k) => [k, issues.filter((i) => sevOf(i.severity) === k).length])) as Record<Sev, number>, [issues]);
  const affected = useMemo(() => new Set(issues.map((i) => i.pageUrl).filter(Boolean)).size, [issues]);

  const areas = useMemo(() => AREAS.map((a) => {
    const list = issues.filter((i) => a.types.includes(i.type));
    const bad = new Set(list.map((i) => i.pageUrl).filter(Boolean)).size;
    const kinds = groups.filter((g) => a.types.includes(g.type));
    return { ...a, bad: Math.min(bad, pages), siteWide: list.some((i) => !i.pageUrl), kinds };
  }), [issues, groups, pages]);

  async function runAgain() {
    if (!analysis?.websiteId) return router.push("/dashboard/seo");
    setRerun(true);
    const res = await fetch("/api/analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId: analysis.websiteId }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.analysisId) router.push(`/dashboard/analysis/${data.analysisId}`);
    else { setRerun(false); setError(data.error ?? "Could not start a new audit."); }
  }

  if (loading) return (<><Topbar title="Site audit" /><div className={ui.pageBody}><p className={ui.awaitingLabel}>Loading…</p></div></>);

  if (error || !analysis) return (
    <>
      <Topbar title="Site audit" />
      <div className={ui.pageBody}>
        <div className={`${s.state} ${s.stateBad}`}><strong>{error || "Analysis not found."}</strong><Link href="/dashboard/websites" className={s.back}>← Websites</Link></div>
      </div>
    </>
  );

  const running = analysis.status === "QUEUED" || analysis.status === "RUNNING";
  const done = analysis.status === "COMPLETED";
  const v = verdict(analysis.overallScore);
  const when = analysis.completedAt ?? analysis.createdAt;
  const name = analysis.website.business.name;
  const shown: Group[] = filter === "ALL" ? groups : groups.filter((g) => g.severity === filter);
  const top = [...opportunities].sort((a, b) => b.score - a.score);

  return (
    <>
      <Topbar title="Site audit" subtitle={name} />
      <div className={ui.pageBody}>
        <div className={s.wrap}>
          <Link href="/dashboard/websites" className={s.back}>← Websites</Link>

          <div className={s.head}>
            <div>
              <h1 className={s.domain}>{name}</h1>
              <p className={s.meta}>
                <a href={analysis.website.url} target="_blank" rel="noreferrer">{analysis.website.url.replace(/^https?:\/\//, "")}</a>
                {when && done ? ` · checked ${new Date(when).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
              </p>
            </div>
            {done || analysis.status === "FAILED" ? (
              <button type="button" className={s.btn} onClick={() => void runAgain()} disabled={rerun}>
                <RefreshCw size={13} />{rerun ? "Starting…" : "Run audit again"}
              </button>
            ) : null}
          </div>

          {running ? (
            <div className={s.state}>
              <strong><span className={s.pulse} />Checking {analysis.website.url.replace(/^https?:\/\//, "")}</strong>
              Reading up to 25 pages and checking titles, descriptions, headings, links, canonicals and structured data. This usually takes 30–90 seconds; the page updates by itself.
            </div>
          ) : null}

          {analysis.status === "FAILED" ? (
            <div className={`${s.state} ${s.stateBad}`}>
              <strong>The audit couldn&apos;t finish</strong>
              {analysis.errorMessage || "Unknown error."} Check that the site opens in a browser, then run the audit again.
            </div>
          ) : null}

          {done && analysis.websiteId ? (
            <div className={s.views} role="tablist">
              <button type="button" role="tab" aria-selected={view === "issues"} data-on={view === "issues" || undefined} onClick={() => pick("issues")}>Issues</button>
              <button type="button" role="tab" aria-selected={view === "keywords"} data-on={view === "keywords" || undefined} onClick={() => pick("keywords")}>Keywords</button>
            </div>
          ) : null}

          {done && view === "keywords" && analysis.websiteId ? <AuditKeywords websiteId={analysis.websiteId} /> : null}

          {done && view === "issues" ? (
            <>
              <section className={s.summary}>
                <div className={s.health}>
                  <div className={s.healthLabel}>Site health</div>
                  <div className={s.healthValue}><strong>{analysis.overallScore ?? "—"}</strong><span>/ 100</span></div>
                  <div className={s.verdict} style={tone(v.tone)}><i />{v.text}</div>
                  <p className={s.healthNote}>Starts at 100. Each problem takes points off by severity; a problem repeated on many pages is capped so one issue can&apos;t sink the score.</p>
                </div>
                <div className={s.overview}>
                  <p className={s.sentence}>
                    {issues.length === 0 ? (
                      <>No problems found on the <b>{pl(pages, "page")}</b> we checked.</>
                    ) : (
                      <>
                        We checked <b>{pl(pages, "page")}</b> and found <b>{pl(groups.length, "kind")} of problem</b> on <b>{affected} of them</b>.
                        {top[0] ? <> Fix first: <b>{top[0].title.toLowerCase()}</b>.</> : null}
                      </>
                    )}
                  </p>
                  {issues.length > 0 ? (
                    <>
                      <div className={s.bar} role="img" aria-label={SEV.map((k) => `${SEV_LABEL[k]} ${bySev[k]}`).join(", ")}>
                        {SEV.filter((k) => bySev[k] > 0).map((k) => <span key={k} style={{ ...tone(SEV_TONE[k]), width: `${(bySev[k] / issues.length) * 100}%` }} />)}
                      </div>
                      <div className={s.legend}>
                        {SEV.map((k) => <span key={k} style={tone(SEV_TONE[k])}><i />{SEV_LABEL[k]} <b>{bySev[k]}</b></span>)}
                      </div>
                    </>
                  ) : null}
                  <div className={s.facts}>
                    <span>Pages checked <b>{pages}</b></span>
                    <span>Pages with problems <b>{affected}</b></span>
                    <span>Problems found <b>{issues.length}</b></span>
                  </div>
                </div>
              </section>

              {top.length > 0 ? (
                <section className={s.panel}>
                  <div className={s.panelHead}>
                    <span className={s.panelTitle}>Fix first</span>
                    <span className={s.panelCount}>{top.length}</span>
                    <span className={s.panelHint}>Ordered by how much each fix helps</span>
                  </div>
                  {top.map((o, i) => <FixRow key={o.id} o={o} rank={i + 1} items={issuesFor(o, issues)} />)}
                </section>
              ) : null}

              <section className={s.panel}>
                <div className={s.panelHead}>
                  <span className={s.panelTitle}>By area</span>
                  <span className={s.panelHint}>Green = pages with no problems in this area</span>
                </div>
                {areas.map((a) => (
                  <div key={a.key} className={s.area}>
                    <div>
                      <div className={s.areaName}>{a.name}</div>
                      <div className={s.areaWhat}>{a.what}</div>
                    </div>
                    <div className={s.areaIssues}>
                      {a.kinds.length === 0 ? <span className={s.ok}>No problems found</span> : a.kinds.map((k, i) => (
                        <span key={k.type}>{i ? " · " : ""}<em>{k.title}</em> on {pl(new Set(k.items.map((x) => x.pageUrl).filter(Boolean)).size || k.items.length, "page")}</span>
                      ))}
                    </div>
                    <div className={s.pages}>
                      <div className={s.pagesText}><span><b>{pages - a.bad}</b> of {pages} pages OK</span>{a.siteWide ? <span>+ site-wide</span> : null}</div>
                      <div className={`${s.meter} ${pages === 0 ? s.meterClean : ""}`}><span style={{ width: `${pages ? ((pages - a.bad) / pages) * 100 : 0}%` }} /></div>
                    </div>
                  </div>
                ))}
              </section>

              <section className={s.panel}>
                <div className={s.panelHead}>
                  <span className={s.panelTitle}>All problems</span>
                  <span className={s.panelCount}>{pl(groups.length, "kind")} · {issues.length} total</span>
                  <div className={s.chips}>
                    <button type="button" className={s.chip} data-on={filter === "ALL" ? "true" : "false"} onClick={() => setFilter("ALL")}>All</button>
                    {SEV.filter((k) => bySev[k] > 0).map((k) => (
                      <button key={k} type="button" className={s.chip} data-on={filter === k ? "true" : "false"} onClick={() => setFilter(k)}>{SEV_LABEL[k]} {bySev[k]}</button>
                    ))}
                  </div>
                </div>
                {shown.length === 0 ? <div className={s.empty}>{issues.length === 0 ? "Nothing to fix. Run the audit again after you change the site." : "No problems at this level."}</div> : null}
                {shown.map((g: Group) => (
                  <details key={g.type} className={s.issue}>
                    <summary>
                      <span className={s.dot} style={tone(SEV_TONE[g.severity])} />
                      <span className={s.issueName}>{g.title}</span>
                      <span className={s.issueSev} style={tone(SEV_TONE[g.severity])}>{SEV_LABEL[g.severity]}</span>
                      <span className={s.issueCount}>{pl(g.items.length, "page")}</span>
                    </summary>
                    <div className={s.issueBody}>
                      <p className={s.issueRec}>{g.recommendation}</p>
                      <PageList items={g.items} />
                    </div>
                  </details>
                ))}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
