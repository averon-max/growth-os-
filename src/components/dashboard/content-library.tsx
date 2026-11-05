"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { WriterButton } from "./writer-button";
import { LinearList, type LGroup, type LRow } from "./linear-list";
import l from "./linear-list.module.css";
import u from "./ui.module.css";
import p from "./planner.module.css";

export interface LibraryArticle {
  id: string; title: string; status: string; keyword: string; intent: string;
  words: number; updated: string; publishError: string | null; publishedUrl: string | null;
}
export interface LibraryOpportunity { id: string; title: string; reason: string; score: number }

type Filter = "all" | "failed" | "draft" | "approved" | "published";
const group = (st: string): Exclude<Filter, "all"> =>
  st === "PUBLISHED" ? "published" : st === "APPROVED" ? "approved" : st === "PUBLISH_FAILED" || st === "REJECTED" || st === "BLOCKED_EXTERNAL" ? "failed" : "draft";
const CAN_APPROVE = new Set(["DRAFT", "IN_REVIEW", "REJECTED", "PUBLISH_FAILED"]);
const CAN_PUBLISH = new Set(["APPROVED", "PUBLISH_FAILED"]);
const META: Record<Exclude<Filter, "all">, { title: string; status: LGroup["status"] }> = {
  failed: { title: "Failed", status: "red" }, draft: { title: "Drafts", status: "gray" },
  approved: { title: "Approved", status: "blue" }, published: { title: "Published", status: "green" },
};
const ORDER: Exclude<Filter, "all">[] = ["failed", "draft", "approved", "published"];
const PAGE = 60;

function Stat({ label, value }: { label: string; value: string }) {
  return <div className={u.statCard}><div className={u.statHeader}><p className={u.statLabel}>{label}</p></div><p className={u.statValue}>{value}</p></div>;
}

export function ContentLibrary({ websiteId, articles, opportunities }: { websiteId: string; articles: LibraryArticle[]; opportunities: LibraryOpportunity[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: articles.length, failed: 0, draft: 0, approved: 0, published: 0 };
    for (const a of articles) c[group(a.status)] += 1;
    return c;
  }, [articles]);
  const avg = articles.length ? Math.round(articles.reduce((n, a) => n + a.words, 0) / articles.length) : 0;
  const ql = q.trim().toLowerCase();
  const shown = articles.filter((a) => (filter === "all" || group(a.status) === filter) && (ql === "" || a.title.toLowerCase().includes(ql) || a.keyword.toLowerCase().includes(ql)));
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = shown.slice(cur * PAGE, cur * PAGE + PAGE);
  const written = useMemo(() => new Set(articles.map((a) => a.keyword.toLowerCase().trim())), [articles]);

  async function act(id: string, kind: "approve" | "publish") {
    setBusy(id + kind); setError(null);
    try {
      const res = await fetch(`/api/content/articles/${id}/${kind}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok === false) setError([data.error ?? `Failed to ${kind}.`, ...(Array.isArray(data.reasons) ? data.reasons : [])].join(" "));
      router.refresh();
    } catch { setError("Network error."); } finally { setBusy(null); }
  }

  const row = (a: LibraryArticle, i: number): LRow => ({
    key: a.id, id: `ART-${cur * PAGE + i + 1}`, status: META[group(a.status)].status, title: a.title || "Untitled article",
    hint: a.publishError ? a.publishError : a.keyword,
    pills: [{ label: a.intent }],
    metrics: [`${a.words.toLocaleString()} w`], date: a.updated,
    onClick: () => router.push(`/dashboard/content/articles/${a.id}`),
    actions: (
      <>
        {a.publishedUrl ? <a className={l.btn} href={a.publishedUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} />Live</a> : null}
        {CAN_APPROVE.has(a.status) ? <button className={l.btn} disabled={busy === a.id + "approve"} onClick={() => void act(a.id, "approve")}>{busy === a.id + "approve" ? <Loader2 size={12} className={p.spin} /> : null}Approve</button> : null}
        {CAN_PUBLISH.has(a.status) ? <button className={`${l.btn} ${l.blue}`} disabled={busy === a.id + "publish"} onClick={() => void act(a.id, "publish")}>{busy === a.id + "publish" ? <Loader2 size={12} className={p.spin} /> : null}Publish</button> : null}
      </>
    ),
  });
  const groups: LGroup[] = ORDER.map((g) => ({ title: META[g].title, status: META[g].status, count: counts[g], rows: slice.filter((a) => group(a.status) === g).map(row) }));
  const oppGroups: LGroup[] = [{
    title: "Content opportunities", status: "yellow", count: opportunities.length,
    rows: opportunities.map((o, i) => ({
      key: o.id, id: `OPP-${i + 1}`, status: written.has(o.title.toLowerCase().trim()) ? "green" : "yellow", title: o.title, hint: o.reason, metrics: [`score ${Math.round(o.score)}`],
      actions: written.has(o.title.toLowerCase().trim()) ? <span className={p.up}>Written</span> : websiteId ? <WriterButton websiteId={websiteId} initialKeyword={o.title} label="Write" compact /> : null,
    })),
  }];

  return (
    <div className={u.pageBody}>
      <div className={u.compactHeader}>
        <div>
          <h1 className={u.compactTitle}>Content</h1>
          <div className={u.compactMeta}>Articles written by Growth OS, from draft to published.</div>
        </div>
        {websiteId ? <WriterButton websiteId={websiteId} /> : null}
      </div>
      <div className={u.statGrid}>
        <Stat label="articles" value={String(counts.all)} />
        <Stat label="drafts" value={String(counts.draft)} />
        <Stat label="approved" value={String(counts.approved)} />
        <Stat label="published" value={String(counts.published)} />
        <Stat label="failed" value={String(counts.failed)} />
        <Stat label="avg words" value={avg.toLocaleString()} />
      </div>
      {error ? <div className={p.err}>{error}</div> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div className={p.tabs}>
          {(["all", ...ORDER] as Filter[]).map((f) => (
            <button key={f} className={p.tab} data-on={filter === f ? "true" : "false"} onClick={() => { setFilter(f); setPage(0); }}>
              {f === "all" ? "All" : META[f].title}<span className={p.tabCount}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <input className={p.search} style={{ marginBottom: 12 }} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Filter articles…" />
      </div>
      <div className={u.group}>
        <LinearList groups={groups} empty={articles.length === 0 ? "No articles yet. Click Write with AI to create the first one." : "Nothing matches."} />
        {pages > 1 ? <div className={p.pager}><button disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Prev</button><span>{cur + 1} / {pages} · {shown.length} articles</span><button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button></div> : null}
      </div>
      <h2 className={u.compactTitle} style={{ fontSize: 15, margin: "36px 0 12px" }}>Opportunities</h2>
      <div className={u.group}>
        <LinearList groups={oppGroups} empty="Run an SEO analysis to surface content opportunities." />
      </div>
      <p className={u.compactMeta} style={{ marginTop: 14 }}><Link className={p.page} href="/dashboard/keyword-planner">Find more topics in Keyword Planner →</Link></p>
    </div>
  );
}
