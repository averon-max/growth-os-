"use client";
import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { BarList, Columns, Meter, TONE } from "./insights";
import s from "./keyword-overview-drawer.module.css";

interface MonthlyPoint { year: number; month: number; searchVolume: number; }
interface GlobalVolume { code: string; label: string; flag: string; volume: number; }
interface OverviewData {
  keyword: string;
  monthlySearches: MonthlyPoint[];
  trend: { yearly: number | null; quarterly: number | null; monthly: number | null } | null;
  globalVolumes: GlobalVolume[];
  otherMarketsAvailable?: number;
  metrics: { volume: number | null; kd: number | null; cpc: number | null; competitionIndex: number | null; intent: string | null } | null;
  error?: string;
}

interface Props {
  keyword: string;
  workspaceId: string;
  market: string;
  language: string;
  onClose: () => void;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}K` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : v.toLocaleString();
const kdWord = (kd: number) => (kd < 30 ? "Easy" : kd < 60 ? "Moderate" : kd < 80 ? "Hard" : "Very hard");
const kdTone = (kd: number | null) => (kd === null ? undefined : kd < 30 ? TONE.good : kd < 60 ? TONE.warn : TONE.bad);

function Trend({ value, label }: { value: number | null | undefined; label: string }) {
  const v = value ?? null;
  const color = v === null || v === 0 ? "#a1a1a1" : v > 0 ? TONE.good : TONE.bad;
  return (
    <div className={s.trend}>
      <span className={s.trendLabel}>{label}</span>
      <span className={s.trendValue} style={{ color }}>{v === null ? "—" : `${v > 0 ? "+" : ""}${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}%`}</span>
    </div>
  );
}

/** Keyword details: one saved DataForSEO answer per keyword and country (see /api/keywords/overview). */
export function KeywordOverviewDrawer({ keyword, workspaceId, market, language, onClose }: Props) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const p = new URLSearchParams({ workspaceId, keyword, market, language });
    fetch(`/api/keywords/overview?${p}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [keyword, workspaceId, market, language]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Other countries cost about $0.01 each the first time, so they load only on request.
  const loadOtherMarkets = () => {
    setMoreBusy(true);
    const p = new URLSearchParams({ workspaceId, keyword, market, language, markets: "all" });
    fetch(`/api/keywords/overview?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d && !d.error) setData(d); })
      .catch(() => undefined)
      .finally(() => setMoreBusy(false));
  };

  const m = data?.metrics ?? null;
  const months = (data?.monthlySearches ?? []).slice(-12);
  const peak = months.reduce((a, x) => Math.max(a, x.searchVolume), 0);
  const others = data?.otherMarketsAvailable ?? 0;

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <aside className={s.panel} role="dialog" aria-label={keyword}>
        <header className={s.head}>
          <div className={s.headText}>
            <h2 className={s.title}>{keyword}</h2>
            <p className={s.sub}>Keyword · {market}{m?.intent ? ` · ${m.intent}` : ""}</p>
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className={s.body}>
          {loading ? (
            <p className={s.status}>Loading…</p>
          ) : !data || data.error ? (
            <p className={s.status}>{data?.error ?? "Could not load this keyword."}</p>
          ) : (
            <>
              <div className={s.kpis}>
                <div className={s.kpi}>
                  <span className={s.kpiLabel}>Volume / mo</span>
                  <span className={s.kpiValue}>{fmt(m?.volume)}</span>
                  <span className={s.kpiSub}>Google searches in {market}</span>
                </div>
                <div className={s.kpi}>
                  <span className={s.kpiLabel}>Difficulty</span>
                  <span className={s.kpiValue} style={{ color: kdTone(m?.kd ?? null) }}>{m?.kd ?? "—"}</span>
                  <Meter value={m?.kd ?? null} good={30} warn={60} invert label={m?.kd == null ? "No data" : kdWord(m.kd)} />
                </div>
                <div className={s.kpi}>
                  <span className={s.kpiLabel}>Cost per click</span>
                  <span className={s.kpiValue}>{m?.cpc == null ? "—" : `$${m.cpc.toFixed(2)}`}</span>
                  <span className={s.kpiSub}>what advertisers pay</span>
                </div>
                <div className={s.kpi}>
                  <span className={s.kpiLabel}>Ad competition</span>
                  <span className={s.kpiValue}>{m?.competitionIndex == null ? "—" : (m.competitionIndex / 100).toFixed(2)}</span>
                  <Meter value={m?.competitionIndex ?? null} good={33} warn={66} invert label="0 = no advertisers, 1 = crowded" />
                </div>
              </div>

              <div className={s.trends}>
                <Trend value={data.trend?.monthly} label="Last month" />
                <Trend value={data.trend?.quarterly} label="Last quarter" />
                <Trend value={data.trend?.yearly} label="Last year" />
              </div>

              <section className={s.section}>
                <h3 className={s.sectionTitle}>Search volume, last 12 months <span>peak {fmt(peak)}</span></h3>
                {months.length ? (
                  <Columns
                    height={110}
                    unit="searches"
                    cols={months.map((x, i) => ({
                      key: `${x.year}-${x.month}`,
                      label: MONTHS[x.month - 1],
                      value: x.searchVolume,
                      hint: String(x.year),
                      color: i === months.length - 1 ? "#70b8ff" : "#0090ff",
                    }))}
                  />
                ) : (
                  <p className={s.status}>No monthly history for this keyword.</p>
                )}
              </section>

              <section className={s.section}>
                <h3 className={s.sectionTitle}>Volume by country</h3>
                <BarList
                  empty="No country data yet."
                  rows={[...data.globalVolumes].sort((a, b) => b.volume - a.volume).map((g, i) => ({ key: g.code, label: `${g.flag} ${g.label}`, value: g.volume, color: ["#0090ff", "#12a594", "#f5a623", "#8e4ec6"][i % 4] }))}
                />
                {others > 0 ? (
                  <button type="button" className={s.more} onClick={loadOtherMarkets} disabled={moreBusy}>
                    {moreBusy ? "Loading…" : `Show ${others} more ${others === 1 ? "country" : "countries"}`}
                  </button>
                ) : null}
              </section>
            </>
          )}
        </div>

        <footer className={s.actions}>
          <a className={s.button} href={`https://www.google.com/search?q=${encodeURIComponent(keyword)}`} target="_blank" rel="noreferrer">
            Google <ExternalLink size={13} />
          </a>
        </footer>
      </aside>
    </>
  );
}
