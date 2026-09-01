"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ui.module.css";

export function RunAnalysisButton({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/analysis/${data.analysisId}`);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <button onClick={run} disabled={loading} className={styles.link} style={{ background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", padding: 0, font: "inherit" }}>
      {loading ? "Starting..." : "Run analysis →"}
    </button>
  );
}
