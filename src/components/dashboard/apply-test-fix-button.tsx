"use client";

// TEMPORARY/TEST ONLY -- lets us exercise the connect -> apply-fix -> verify
// pipeline against the mock Integration API without a real CMS UI yet.
// Safe to delete once a proper "apply fix" flow exists in the product.

import { useState } from "react";
import styles from "./ui.module.css";

export function ApplyTestFixButton({ websiteId }: { websiteId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/cms/apply-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          pageUrl: "https://scanmycreds.com/",
          fixType: "META_TITLE",
          newValue: "ScanMyCreds — Test Fix Applied",
        }),
      });
      const data = await res.json();
      setResult({ status: res.status, body: data });
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "16px 0" }}>
      <button className={styles.primaryButton} onClick={run} disabled={loading}>
        {loading ? "Applying..." : "Apply test META_TITLE fix"}
      </button>
      {result != null && (
        <pre style={{ marginTop: 12, padding: 12, background: "var(--elevated)", borderRadius: 8, fontSize: "0.72rem", overflow: "auto", color: "var(--secondary)" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
