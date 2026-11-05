"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { WriterButton } from "./writer-button";
import s from "./content-library.module.css";

export interface LibraryArticle {
  id: string; title: string; status: string; keyword: string; intent: string;
  words: number; updated: string; publishError: string | null; publishedUrl: string | null;
}
export interface LibraryOpportunity { id: string; title: string; reason: string; score: number }

const FILTERS = [["all", "All"], ["draft", "Drafts"], ["approved", "Approved"], ["published", "Published"], ["failed", "Failed"]] as const;
type Filter = (typeof FILTERS)[number][0];
const group = (st: string): Filter =>
  st === "PUBLISHED" ? "published" : st === "APPROVED" ? "approved" : st === "PUBLISH_FAILED" || st === "REJECTED" || st === "BLOCKED_EXTERNAL" ? "failed" : "draft";
const CAN_APPROVE = new Set(["DRAFT", "IN_REVIEW", "REJECTED", "PUBLISH_FAILED"]);
const CAN_PUBLISH = new Set(["APPROVED", "PUBLISH_FAILED"]);

export function ContentLibrary({ websiteId, articles, opportunities }: { websiteId: string; articles: LibraryArticle[]; opportunities: LibraryOpportunity[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: articles.length, draft: 0, approved: 0, published: 0, failed: 0 };
    for (const a of articles) c[group(a.status)] += 1;
    return c;
  }, [articles]);
  const avg = articles.length ? Math.round(articles.reduce((n, a) => n + a.words, 0) / articles.length) : 0;
  const shown = filter === "all" ? articles : articles.filter((a) => group(a.status) === filter);
  const written = useMemo(() => new Set(articles.map((a) => a.keyword.toLowerCase().trim())), [articles]);

  async function act(id: string, kind: "approve" | "publish") {
    setBusy(id + kind);
    setError(null);
    try {
      const res = await fetch(`/api/content/articles/${id}/${kind}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok === false) setError([data.error ?? `Failed to ${kind}.`, ...(Array.isArray(data.reasons) ? data.reasons : [])].join(" "));
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <div>
          <div className={s.eyebrow}>Content library</div>
          <h2 className={s.title}>Articles</h2>
        </div>
        {websiteId ? <WriterButton websiteId={websiteId} /> : null}
      </div>

      <div className={s.strip}>
        <div className={s.m}><span className={s.l}>Total</span><span className={s.v}>{counts.all}</span></div>
        <div className={s.m}><span className={s.l}>Drafts</span><span className={s.v}>{counts.draft}</span></div>
        <div className={s.m}><span className={s.l}>Approved</span><span className={s.v} data-tone="blue">{counts.approved}</span></div>
        <div className={s.m}><span className={s.l}>Published</span><span className={s.v} data-tone="good">{counts.published}</span></div>
        <div className={s.m}><span className={s.l}>Failed</span><span className={s.v} data-tone={counts.failed > 0 ? "bad" : undefined}>{counts.failed}</span></div>
        <div className={s.m}><span className={s.l}>Avg words</span><span className={s.v}>{avg.toLocaleString()}</span></div>
      </div>

      {error ? <div className={s.error}>{error}</div> : null}

      <section className={s.card}>
        <div className={s.head}>
          <span className={s.headTitle}>Articles</span>
          <div className={s.tabs}>
            {FILTERS.map(([key, label]) => (
              <button key={key} className={s.tab} data-on={filter === key ? "true" : "false"} onClick={() => setFilter(key)}>
                {label}<span className={s.count}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <div className={s.empty}>{articles.length === 0 ? "No articles yet. Click Write with AI to create the first one." : "Nothing in this filter."}</div>
        ) : (
          shown.map((a) => (
            <div key={a.id} className={s.row}>
              <span className={s.pill} data-g={group(a.status)}>{a.status.replaceAll("_", " ")}</span>
              <div className={s.main}>
                <Link href={`/dashboard/content/articles/${a.id}`} className={s.name}>{a.title || "Untitled article"}</Link>
                <span className={s.kw}>{a.keyword} · {a.intent}</span>
                {a.publishError ? <span className={s.err}>{a.publishError}</span> : null}
              </div>
              <span className={s.num}>{a.words.toLocaleString()} w</span>
              <span className={s.num}>{a.updated}</span>
              <div className={s.actions}>
                {a.publishedUrl ? <a className={s.btn} href={a.publishedUrl} target="_blank" rel="noreferrer"><ExternalLink size={12} />Live</a> : null}
                {CAN_APPROVE.has(a.status) ? (
                  <button className={s.btn} disabled={busy === a.id + "approve"} onClick={() => act(a.id, "approve")}>
                    {busy === a.id + "approve" ? <Loader2 size={12} className={s.spin} /> : null}Approve
                  </button>
                ) : null}
                {CAN_PUBLISH.has(a.status) ? (
                  <button className={`${s.btn} ${s.btnBlue}`} disabled={busy === a.id + "publish"} onClick={() => act(a.id, "publish")}>
                    {busy === a.id + "publish" ? <Loader2 size={12} className={s.spin} /> : null}Publish
                  </button>
                ) : null}
                <Link className={s.btn} href={`/dashboard/content/articles/${a.id}`}>Open</Link>
              </div>
            </div>
          ))
        )}
      </section>

      <section className={s.card}>
        <div className={s.head}><span className={s.headTitle}>Content opportunities</span><span className={s.count}>{opportunities.length} from SEO analysis</span></div>
        {opportunities.length === 0 ? (
          <div className={s.empty}>Run an SEO analysis to surface content opportunities.</div>
        ) : (
          opportunities.map((o) => (
            <div key={o.id} className={s.opp}>
              <span className={s.score}>{Math.round(o.score)}</span>
              <div className={s.main}>
                <span className={s.name}>{o.title}</span>
                <span className={s.kw}>{o.reason}</span>
              </div>
              {written.has(o.title.toLowerCase().trim()) ? <span className={s.done}>✓ Written</span> : websiteId ? <WriterButton websiteId={websiteId} initialKeyword={o.title} label="Write" compact /> : null}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
