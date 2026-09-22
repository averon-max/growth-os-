"use client";

import { useState } from "react";
import { KeywordSignals } from "./keyword-signals";
import { KeywordsExplorer } from "./keywords-explorer";
import { KeywordSuggestions } from "./keyword-suggestions";
import { IndustryTopKeywords } from "./industry-top-keywords";
import { LiveRankIntelligence } from "./live-rank-intelligence";
import styles from "./ui.module.css";

const MARKET_OPTIONS = [
  { code: "US", label: "🇺🇸 United States" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "GB", label: "🇬🇧 United Kingdom" },
  { code: "AU", label: "🇦🇺 Australia" },
] as const;

export function KeywordsPageClient({
  workspaceId,
  websiteId,
  industrySeed,
}: {
  workspaceId: string;
  websiteId: string | null;
  industrySeed: string | null;
}) {
  const [market, setMarket] = useState<string>("US");

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: "0.78rem", color: "var(--secondary)" }}>Market</span>
        <select
          style={{
            background: "var(--surface)",
            color: "var(--primary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: "0.78rem",
            cursor: "pointer",
          }}
          value={market}
          onChange={(e) => setMarket(e.target.value)}
        >
          {MARKET_OPTIONS.map((m) => (
            <option key={m.code} value={m.code}>{m.label}</option>
          ))}
        </select>
      </div>

      {websiteId && (
        <LiveRankIntelligence
          workspaceId={workspaceId}
          websiteId={websiteId}
          market={market}
        />
      )}

      {industrySeed && (
        <IndustryTopKeywords workspaceId={workspaceId} seed={industrySeed} market={market} />
      )}
      <KeywordSuggestions workspaceId={workspaceId} market={market} />
      <KeywordSignals workspaceId={workspaceId} />
      <KeywordsExplorer workspaceId={workspaceId} market={market} />
    </>
  );
}
