"use client";

import { useMemo, useState } from "react";
import { DotMap } from "./dot-map";
import s from "./country-map.module.css";

export type CountryStat = { code: string; visits: number; clicks: number | null; impressions: number | null };
const regionName = (() => {
  let names: Intl.DisplayNames | null = null;
  return (code: string) => {
    try {
      names ??= new Intl.DisplayNames(["en"], { type: "region" });
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
})();

type Source = "visits" | "clicks" | "impressions";

const SOURCES: { key: Source; label: string; unit: string }[] = [
  { key: "visits", label: "Cloudflare visits", unit: "visits" },
  { key: "clicks", label: "Google clicks", unit: "clicks" },
  { key: "impressions", label: "Google impressions", unit: "impressions" },
];

/*
 * Countries from the one traffic report (the same numbers on the Overview, Traffic report and Audience).
 * A switch picks the source: Cloudflare visits, or Google clicks / impressions from Search Console.
 */
export function CountryMap({ rows, daily, fill = false, withList = true, limit = 12 }: { rows: CountryStat[]; /** Visits per day by country: enables 7 / 14 / 28 days for Cloudflare visits. */ daily?: { date: string; values: Record<string, number> }[]; fill?: boolean; withList?: boolean; limit?: number }) {
  const hasGoogle = rows.some((r) => r.clicks !== null);
  const [source, setSource] = useState<Source>("visits");
  const [period, setPeriod] = useState<7 | 14 | 28>(28);
  // Shorter periods are summed from the daily visits; Google countries exist only for the whole report period.
  const byPeriod = useMemo(() => {
    if (!daily?.length || period === 28 || source !== "visits") return null;
    const m = new Map<string, number>();
    for (const d of daily.slice(-period)) for (const [code, v] of Object.entries(d.values)) m.set(code, (m.get(code) ?? 0) + v);
    return m;
  }, [daily, period, source]);
  const pick = SOURCES.find((x) => x.key === source)!;
  const data = byPeriod
    ? [...byPeriod.entries()].map(([code, value]) => ({ code, label: regionName(code), value }))
    : rows.map((r) => ({ code: r.code, label: regionName(r.code), value: (source === "visits" ? r.visits : source === "clicks" ? r.clicks : r.impressions) ?? 0 }));
  return (
    <div className={fill ? s.fill : s.wrap}>
      <div className={s.bar}>
      <div className={s.switch} role="tablist" aria-label="Data source">
        {SOURCES.filter((x) => x.key === "visits" || hasGoogle).map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={source === x.key} data-on={source === x.key || undefined} onClick={() => setSource(x.key)}>
            {x.label}
          </button>
        ))}
      </div>
      {daily?.length && source === "visits" ? (
        <div className={s.switch} role="tablist" aria-label="Period">
          {([7, 14, 28] as const).map((p) => (
            <button key={p} type="button" role="tab" aria-selected={period === p} data-on={period === p || undefined} onClick={() => setPeriod(p)}>
              {p}d
            </button>
          ))}
        </div>
      ) : null}
      </div>
      <div className={s.map}>
        <DotMap fill={fill} withList={withList} limit={limit} rows={data} unit={pick.unit} />
      </div>
    </div>
  );
}
