"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";

export default function AddWebsitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [form, setForm] = useState({ businessName: "", industry: "", location: "", websiteUrl: "" });

  useEffect(() => {
    fetch("/api/workspaces/mine")
      .then((r) => r.json())
      .then((data) => {
        if (data?.workspaceId) setWorkspaceId(data.workspaceId);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!workspaceId) {
      setError("Session error. Please refresh and try again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      const analysisRes = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId: data.website.id }),
      });
      const analysisData = await analysisRes.json();
      if (!analysisRes.ok) {
        setError(analysisData.error || "Failed to start analysis.");
        return;
      }

      router.push(`/dashboard/analysis/${analysisData.analysisId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Topbar title="Add Website" />
      <div className={styles.pageBody} style={{ maxWidth: 480, margin: "0 auto", paddingTop: 40 }}>
        <Link href="/dashboard/websites" className={styles.backLink}>← Websites</Link>
        <h1 className={styles.pageTitle} style={{ marginTop: 10 }}>Add website</h1>
        <p className={styles.pageSubtitle}>We will crawl your site and find real SEO opportunities.</p>

        <div className={styles.formCard}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Business name *</label>
            <input
              className={styles.formInput}
              type="text"
              placeholder="Acme Hardware"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Website URL *</label>
            <input
              className={styles.formInput}
              type="text"
              placeholder="https://example.com"
              value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Industry</label>
            <input
              className={styles.formInput}
              type="text"
              placeholder="e.g. Plumbing, E-commerce, Healthcare"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Location</label>
            <input
              className={styles.formInput}
              type="text"
              placeholder="e.g. Calgary, AB"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          {error && <div className={styles.formError}>{error}</div>}

          <button
            className={styles.primaryButton}
            style={{ marginTop: 4 }}
            onClick={handleSubmit}
            disabled={loading || !form.businessName || !form.websiteUrl || !workspaceId}
          >
            {loading ? "Starting analysis..." : "Analyze website →"}
          </button>
        </div>
      </div>
    </>
  );
}
