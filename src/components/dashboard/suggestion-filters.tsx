"use client";
import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import type { Suggestion, SearchVolumeTrend } from "./keyword-suggestions";

export interface SuggestionFilters {
  minVolume: string;
  maxVolume: string;
  minKd: string;
  maxKd: string;
  minCpc: string;
  maxCpc: string;
  competition: string;
  trendDir: string;
  include: string;
  exclude: string;
}

export const EMPTY_FILTERS: SuggestionFilters = {
  minVolume: "", maxVolume: "", minKd: "", maxKd: "",
  minCpc: "", maxCpc: "", competition: "", trendDir: "", include: "", exclude: "",
};

function trendDirection(t: SearchVolumeTrend | null): "up" | "down" | "flat" | null {
  const v = t?.yearly ?? t?.quarterly ?? t?.monthly ?? null;
  if (v === null) return null;
  if (v > 5) return "up";
  if (v < -5) return "down";
  return "flat";
}

export function applySuggestionFilters(suggestions: Suggestion[], f: SuggestionFilters): Suggestion[] {
  return suggestions.filter(s => {
    if (f.minVolume && (s.searchVolume ?? 0) < Number(f.minVolume)) return false;
    if (f.maxVolume && (s.searchVolume ?? 0) > Number(f.maxVolume)) return false;
    if (f.minKd && (s.keywordDifficulty ?? 0) < Number(f.minKd)) return false;
    if (f.maxKd && (s.keywordDifficulty ?? 101) > Number(f.maxKd)) return false;
    if (f.minCpc && (s.cpc ?? 0) < Number(f.minCpc)) return false;
    if (f.maxCpc && (s.cpc ?? 0) > Number(f.maxCpc)) return false;
    if (f.competition && s.competitionLevel !== f.competition) return false;
    if (f.trendDir) {
      const dir = trendDirection(s.trend);
      if (dir !== f.trendDir) return false;
    }
    if (f.include.trim()) {
      const terms = f.include.toLowerCase().split(",").map(t => t.trim()).filter(Boolean);
      if (!terms.every(t => s.keyword.toLowerCase().includes(t))) return false;
    }
    if (f.exclude.trim()) {
      const terms = f.exclude.toLowerCase().split(",").map(t => t.trim()).filter(Boolean);
      if (terms.some(t => s.keyword.toLowerCase().includes(t))) return false;
    }
    return true;
  });
}

function activeCount(f: SuggestionFilters): number {
  return Object.values(f).filter(v => v !== "").length;
}

const inputSt: React.CSSProperties = {
  width: 72, padding: "4px 7px",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 5, color: "var(--primary)", fontSize: "0.78rem",
};

const selectSt: React.CSSProperties = {
  padding: "4px 8px",
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 5, color: "var(--primary)", fontSize: "0.78rem", cursor: "pointer",
};

interface Props {
  filters: SuggestionFilters;
  onChange: (f: SuggestionFilters) => void;
  resultCount: number;
  totalCount: number;
}

export function SuggestionFilterBar({ filters, onChange, resultCount, totalCount }: Props) {
  const [open, setOpen] = useState(false);
  const count = activeCount(filters);
  const hasActive = count > 0;

  const set = (key: keyof SuggestionFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const clear = () => onChange(EMPTY_FILTERS);

  // Active chips
  const chips: string[] = [];
  if (filters.minVolume && filters.maxVolume) chips.push(`Vol ${Number(filters.minVolume).toLocaleString()}–${Number(filters.maxVolume).toLocaleString()}`);
  else if (filters.minVolume) chips.push(`Vol ≥ ${Number(filters.minVolume).toLocaleString()}`);
  else if (filters.maxVolume) chips.push(`Vol ≤ ${Number(filters.maxVolume).toLocaleString()}`);
  if (filters.minKd && filters.maxKd) chips.push(`KD ${filters.minKd}–${filters.maxKd}`);
  else if (filters.minKd) chips.push(`KD ≥ ${filters.minKd}`);
  else if (filters.maxKd) chips.push(`KD ≤ ${filters.maxKd}`);
  if (filters.minCpc) chips.push(`CPC ≥ $${filters.minCpc}`);
  if (filters.maxCpc) chips.push(`CPC ≤ $${filters.maxCpc}`);
  if (filters.competition) chips.push(`Comp: ${filters.competition}`);
  if (filters.trendDir) chips.push(`Trend: ${filters.trendDir === "up" ? "↑ Growing" : filters.trendDir === "down" ? "↓ Declining" : "→ Flat"}`);
  if (filters.include) chips.push(`Contains: ${filters.include}`);
  if (filters.exclude) chips.push(`Excludes: ${filters.exclude}`);

  return (
    <div style={{ marginBottom: 10 }}>
      {/* Toolbar row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 6, fontSize: "0.78rem", cursor: "pointer",
            border: "1px solid var(--border)",
            background: hasActive ? "var(--accent)" : "var(--surface)",
            color: hasActive ? "#fff" : "var(--primary)",
          }}
        >
          <SlidersHorizontal size={13} />
          Filters{hasActive ? ` (${count})` : ""}
          <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "0.15s" }} />
        </button>

        {/* Quick presets */}
        {[
          { label: "KD < 30", f: { ...EMPTY_FILTERS, maxKd: "30" } },
          { label: "Vol > 1K", f: { ...EMPTY_FILTERS, minVolume: "1000" } },
          { label: "CPC > $2", f: { ...EMPTY_FILTERS, minCpc: "2" } },
          { label: "↑ Growing", f: { ...EMPTY_FILTERS, trendDir: "up" } },
          { label: "LOW comp", f: { ...EMPTY_FILTERS, competition: "LOW" } },
        ].map(p => (
          <button key={p.label} onClick={() => onChange(p.f)} style={{
            padding: "4px 10px", borderRadius: 20, fontSize: "0.7rem", cursor: "pointer",
            border: "1px solid var(--border)", background: "var(--surface)", color: "var(--secondary)",
          }}>{p.label}</button>
        ))}

        {hasActive && (
          <button onClick={clear} style={{
            display: "flex", alignItems: "center", gap: 3,
            fontSize: "0.7rem", color: "var(--secondary)", background: "none", border: "none", cursor: "pointer",
          }}>
            <X size={11} /> Clear
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--secondary)" }}>
          {hasActive ? `${resultCount} of ${totalCount}` : `${totalCount} keywords`}
        </span>
      </div>

      {/* Active chips */}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
          {chips.map(chip => (
            <span key={chip} style={{
              padding: "2px 8px", borderRadius: 12, fontSize: "0.7rem",
              background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--secondary)",
            }}>{chip}</span>
          ))}
        </div>
      )}

      {/* Filter panel */}
      {open && (
        <div style={{
          marginTop: 8, background: "var(--elevated)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "14px 16px",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>

            {/* Volume */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Search Volume</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input type="number" placeholder="Min" value={filters.minVolume}
                  onChange={e => set("minVolume", e.target.value)} style={inputSt} />
                <span style={{ color: "var(--secondary)", fontSize: "0.75rem" }}>–</span>
                <input type="number" placeholder="Max" value={filters.maxVolume}
                  onChange={e => set("maxVolume", e.target.value)} style={inputSt} />
              </div>
            </div>

            {/* KD */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Keyword Difficulty</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input type="number" placeholder="Min" min={0} max={100} value={filters.minKd}
                  onChange={e => set("minKd", e.target.value)} style={inputSt} />
                <span style={{ color: "var(--secondary)", fontSize: "0.75rem" }}>–</span>
                <input type="number" placeholder="Max" min={0} max={100} value={filters.maxKd}
                  onChange={e => set("maxKd", e.target.value)} style={inputSt} />
              </div>
            </div>

            {/* CPC */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>CPC ($)</div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input type="number" placeholder="Min" step="0.01" value={filters.minCpc}
                  onChange={e => set("minCpc", e.target.value)} style={inputSt} />
                <span style={{ color: "var(--secondary)", fontSize: "0.75rem" }}>–</span>
                <input type="number" placeholder="Max" step="0.01" value={filters.maxCpc}
                  onChange={e => set("maxCpc", e.target.value)} style={inputSt} />
              </div>
            </div>

            {/* Competition */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Competition</div>
              <select value={filters.competition} onChange={e => set("competition", e.target.value)} style={{ ...selectSt, width: "100%" }}>
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Trend */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Trend</div>
              <select value={filters.trendDir} onChange={e => set("trendDir", e.target.value)} style={{ ...selectSt, width: "100%" }}>
                <option value="">All</option>
                <option value="up">↑ Growing (&gt;5% YoY)</option>
                <option value="down">↓ Declining (&lt;-5% YoY)</option>
                <option value="flat">→ Flat</option>
              </select>
            </div>

            {/* Include */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Contains word</div>
              <input type="text" placeholder="e.g. free, best" value={filters.include}
                onChange={e => set("include", e.target.value)}
                style={{ ...inputSt, width: "100%" }} />
            </div>

            {/* Exclude */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Excludes word</div>
              <input type="text" placeholder="e.g. cheap, scam" value={filters.exclude}
                onChange={e => set("exclude", e.target.value)}
                style={{ ...inputSt, width: "100%" }} />
            </div>

          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setOpen(false)} style={{
              padding: "5px 18px", background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer",
            }}>Done</button>
            <button onClick={clear} style={{
              padding: "5px 14px", background: "var(--surface)", color: "var(--secondary)",
              border: "1px solid var(--border)", borderRadius: 6, fontSize: "0.8rem", cursor: "pointer",
            }}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
