"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AddKeyword, PlannerSite } from "@/components/dashboard/add-keyword";
import { readCache, writeCache } from "@/lib/client-cache";
import s from "./audit-keywords.module.css";

type Row = { keyword: string; position: number | null; volume: number | null; clicks: number; impressions: number; page: string | null };
type Data = { seed: string; updatedAt: string | null; keywords: Row[]; rising: { query: string; value: number }[]; top: { query: string; value: number }[] };
type Band = "all" | "top3" | "top10" | "top20" | "beyond" | "none";

const BANDS: { key: Band; label: string; test: (p: number | null) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "top3", label: "Top 3", test: (p) => p !== null && p <= 3 },
  { key: "top10", label: "4–10", test: (p) => p !== null && p > 3 && p <= 10 },
  { key: "top20", label: "11–20", test: (p) => p !== null && p > 10 && p <= 20 },
  { key: "beyond", label: "21+", test: (p) => p !== null && p > 20 },
  { key: "none", label: "Not ranking", test: (p) => p === null },
];

const path = (u: string | null) => {
  if (!u) return "—";
  try { return new URL(u).pathname || "/"; } catch { return u; }
};

/** SEO audit → Keywords: where every keyword of the site ranks, and Google Trends ideas close to it. Free. */
export function AuditKeywords({ websiteId }: { websiteId: string }) {
  const key = `audit-kw:${websiteId}`;
  const [data, setData] = useState<Data | null>(() => readCache<Data>(key));
  const [error, setError] = useState("");
  const [band, setBand] = useState<Band>("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`/api/audit/keywords?websiteId=${encodeURIComponent(websiteId)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Couldn't load keywords.");
        setData(j);
        writeCache(key, j);
      })
      .catch((e: Error) => setError(e.message));
  }, [websiteId, key]);

  const rows = useMemo(() => {
    const t = BANDS.find((b) => b.key === band)!.test;
    const needle = q.trim().toLowerCase();
    return (data?.keywords ?? []).filter((r) => t(r.position) && (!needle || r.keyword.includes(needle)));
  }, [data, band, q]);

  if (error && !data) return <p className={s.empty}>{error}</p>;
  if (!data) return <p className={s.empty}>Loading keywords…</p>;

  return (
    <PlannerSite websiteId={websiteId}>
      <div className={s.wrap}>
        <section className={s.panel}>
          <header className={s.head}>
            <div>
              <h2 className={s.title}>Your keywords</h2>
              <p className={s.sub}>Google position from Search Console and the Keyword Planner{data.updatedAt ? ` · updated ${new Date(data.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</p>
            </div>
            <input className={s.search} placeholder="Filter keywords…" value={q} onChange={(e) => setQ(e.target.value)} />
          </header>
          <div className={s.bands}>
            {BANDS.map((b) => {
              const n = (data.keywords ?? []).filter((r) => b.test(r.position)).length;
              return (
                <button key={b.key} type="button" data-on={band === b.key || undefined} onClick={() => setBand(b.key)}>
                  {b.label} <span>{n}</span>
                </button>
              );
            })}
          </div>
          {data.keywords.length === 0 ? (
            <p className={s.empty}>No keywords yet. Open the <Link href="/dashboard/keyword-planner">Keyword Planner</Link> and run it once — the keywords appear here.</p>
          ) : (
            <table className={s.table}>
              <thead>
                <tr><th>Keyword</th><th className={s.num}>Position</th><th className={s.num}>Volume</th><th className={s.num}>Clicks</th><th className={s.num}>Impressions</th><th>Page</th></tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((r) => (
                  <tr key={r.keyword}>
                    <td><span className={s.kw}>{r.keyword}</span><AddKeyword keyword={r.keyword} /></td>
                    <td className={s.num} data-band={r.position === null ? "none" : r.position <= 3 ? "top" : r.position <= 10 ? "good" : undefined}>{r.position ?? "—"}</td>
                    <td className={s.num}>{r.volume?.toLocaleString("en-US") ?? "—"}</td>
                    <td className={s.num}>{r.clicks.toLocaleString("en-US")}</td>
                    <td className={s.num}>{r.impressions.toLocaleString("en-US")}</td>
                    <td className={s.page}>{path(r.page)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className={s.panel}>
          <header className={s.head}>
            <div>
              <h2 className={s.title}>Similar searches on Google Trends</h2>
              <p className={s.sub}>Close in meaning to “{data.seed}”. Hover one and press + to track it.</p>
            </div>
          </header>
          {data.rising.length + data.top.length === 0 ? (
            <p className={s.empty}>Google Trends has nothing for this topic right now.</p>
          ) : (
            <div className={s.ideas}>
              {[
                { label: "Rising", list: data.rising, show: (v: number) => (v >= 5000 ? "new" : `+${v}%`) },
                { label: "Most searched", list: data.top, show: (v: number) => String(v) },
              ].map((g) =>
                g.list.length ? (
                  <div key={g.label} className={s.group}>
                    <div className={s.groupLabel}>{g.label}</div>
                    <div className={s.chips}>
                      {g.list.map((t) => (
                        <span key={t.query} className={s.chip} data-kw="">
                          {t.query}
                          <em>{g.show(t.value)}</em>
                          <AddKeyword keyword={t.query} />
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </section>
      </div>
    </PlannerSite>
  );
}
