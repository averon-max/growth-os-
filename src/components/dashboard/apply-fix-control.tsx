"use client";

import { useState } from "react";
import styles from "./ui.module.css";

const SUPPORTED_ISSUE_TYPES: Record<string, "META_TITLE"> = {
  MISSING_TITLE: "META_TITLE",
  TITLE_TOO_LONG: "META_TITLE",
  TITLE_TOO_SHORT: "META_TITLE",
};

interface Props {
  issueId: string;
  issueType: string;
  pageUrl: string;
  websiteId: string;
  cmsConnected: boolean;
}

type Phase = "idle" | "loading-suggestion" | "reviewing" | "applying" | "success" | "failed";

export function ApplyFixControl({ issueId, issueType, pageUrl, websiteId, cmsConnected }: Props) {
  const fixType = SUPPORTED_ISSUE_TYPES[issueType];
  const [phase, setPhase] = useState<Phase>("idle");
  const [draftValue, setDraftValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!fixType || !pageUrl) {
    return null;
  }

  if (!cmsConnected) {
    return <span className={styles.awaitingLabel}>Connect a CMS to apply fixes</span>;
  }

  const loadSuggestion = async () => {
    setPhase("loading-suggestion");
    setError(null);
    try {
      const res = await fetch(`/api/seo/suggestions/${issueId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not generate a suggestion.");
        setPhase("idle");
        return;
      }
      setDraftValue(data.suggestion.suggestedValue);
      setPhase("reviewing");
    } catch {
      setError("Network error.");
      setPhase("idle");
    }
  };

  const apply = async () => {
    setPhase("applying");
    setError(null);
    try {
      const res = await fetch("/api/cms/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, issueId, pageUrl, fixType, newValue: draftValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to apply fix.");
        setPhase("failed");
        return;
      }
      if (data.fix.status !== "SUCCESS") {
        setError(data.fix.errorMessage || "The CMS reported a failure.");
        setPhase("failed");
        return;
      }
      setPhase("success");
    } catch {
      setError("Network error.");
      setPhase("failed");
    }
  };

  if (phase === "idle" || phase === "loading-suggestion") {
    return (
      <button
        onClick={loadSuggestion}
        disabled={phase === "loading-suggestion"}
        className={styles.link}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}
      >
        {phase === "loading-suggestion" ? "Loading..." : "Suggest fix →"}
      </button>
    );
  }

  if (phase === "success") {
    return <span style={{ color: "var(--success)", fontSize: "0.78rem", fontWeight: 500 }}>Applied</span>;
  }

  return (
    <div style={{ minWidth: 260 }}>
      <p style={{ fontSize: "0.68rem", color: "var(--warning)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Draft — review before applying
      </p>
      <textarea
        className={styles.formInput}
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        rows={2}
        style={{ resize: "vertical", marginBottom: 8 }}
      />
      {error && <div className={styles.formError}>{error}</div>}
      <button
        onClick={apply}
        disabled={phase === "applying" || !draftValue.trim()}
        className={styles.primaryButton}
        style={{ width: "auto", padding: "6px 14px", fontSize: "0.76rem" }}
      >
        {phase === "applying" ? "Applying..." : "Apply fix"}
      </button>
    </div>
  );
}
