"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddWebsitePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    location: "",
    websiteUrl: "",
  });

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(async (session) => {
        const userId = session?.user?.id;
        if (!userId) return;
        const res = await fetch("/api/workspaces/mine");
        const data = await res.json();
        if (data?.workspaceId) setWorkspaceId(data.workspaceId);
      });
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
    <div style={{ background: "var(--dash-bg)", minHeight: "100vh", padding: "48px 32px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--dash-primary)" }}>Add website</h1>
        <p style={{ color: "var(--dash-muted)", fontSize: "0.85rem", marginBottom: 36 }}>We will crawl your site and find real SEO opportunities.</p>

        <div style={{ background: "var(--dash-surface)", borderRadius: 12, border: "1px solid var(--dash-border)", padding: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "var(--dash-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Business name *</label>
              <input
                type="text"
                placeholder="Acme Hardware"
                value={form.businessName}
                onChange={e => setForm({ ...form, businessName: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-elevated)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "var(--dash-primary)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "var(--dash-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Website URL *</label>
              <input
                type="text"
                placeholder="https://example.com"
                value={form.websiteUrl}
                onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-elevated)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "var(--dash-primary)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "var(--dash-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Industry</label>
              <input
                type="text"
                placeholder="e.g. Plumbing, E-commerce, Healthcare"
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-elevated)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "var(--dash-primary)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 500, marginBottom: 6, color: "var(--dash-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Location</label>
              <input
                type="text"
                placeholder="e.g. Calgary, AB"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--dash-border)", background: "var(--dash-elevated)", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", color: "var(--dash-primary)" }}
              />
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: "0.82rem", color: "var(--dash-danger)" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !form.businessName || !form.websiteUrl || !workspaceId}
              style={{ padding: "12px", borderRadius: 8, background: loading || !workspaceId ? "var(--dash-elevated)" : "var(--dash-accent)", color: "#fff", fontWeight: 600, fontSize: "0.85rem", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
            >
              {loading ? "Starting analysis..." : "Analyze website →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
