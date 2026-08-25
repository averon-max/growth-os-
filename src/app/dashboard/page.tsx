"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar, Stat } from "@/components/dashboard/topbar";

interface Website {
  id: string;
  url: string;
  business: { name: string };
  analyses: Array<{
    id: string;
    status: string;
    overallScore: number | null;
    pagesCount: number | null;
    createdAt: string;
  }>;
}

export default function DashboardOverview() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/websites")
      .then(r => r.json())
      .then(data => {
        setWebsites(data.websites || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const latestAnalysis = websites[0]?.analyses[0];

  return (
    <div style={{ background: "#f2f1ed", minHeight: "100vh" }}>
      <Topbar title="Overview" site={websites[0]?.url || "No website yet"} />
      <div style={{ padding: "32px" }}>

        {loading && (
          <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.85rem" }}>Loading...</p>
        )}

        {!loading && websites.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", padding: 48, textAlign: "center", maxWidth: 480, margin: "60px auto" }}>
            <h2 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", marginBottom: 12 }}>No website yet</h2>
            <p style={{ color: "rgba(0,0,0,0.4)", fontSize: "0.88rem", marginBottom: 28, lineHeight: 1.6 }}>Add your first website to start a real SEO analysis.</p>
            <Link href="/dashboard/add-website" style={{ display: "inline-block", background: "#0a0a0a", color: "#f2f1ed", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", padding: "12px 28px", borderRadius: 100 }}>
              Add Website →
            </Link>
          </div>
        )}

        {!loading && websites.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              <Stat label="SEO Score" value={latestAnalysis?.overallScore != null ? String(latestAnalysis.overallScore) : "—"} />
              <Stat label="Pages crawled" value={latestAnalysis?.pagesCount != null ? String(latestAnalysis.pagesCount) : "—"} />
              <Stat label="Status" value={latestAnalysis?.status || "—"} />
              <Stat label="Websites" value={String(websites.length)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: 24 }}>
                <p style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 16 }}>Your websites</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {websites.map(w => (
                    <div key={w.id} style={{ background: "#f8f8f6", borderRadius: 10, padding: "12px 16px" }}>
                      <p style={{ fontWeight: 600, fontSize: "0.85rem", margin: 0 }}>{w.business.name}</p>
                      <p style={{ fontSize: "0.72rem", fontFamily: "SF Mono, monospace", color: "rgba(0,0,0,0.35)", margin: "2px 0 8px" }}>{w.url}</p>
                      {w.analyses[0] ? (
                        <Link href={`/dashboard/analysis/${w.analyses[0].id}`} style={{ fontSize: "0.75rem", color: "#d4a030", textDecoration: "none", fontWeight: 600 }}>
                          View analysis →
                        </Link>
                      ) : (
                        <Link href={`/dashboard/add-website`} style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.4)", textDecoration: "none" }}>
                          No analysis yet
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <p style={{ fontWeight: 700, fontSize: "0.88rem", textAlign: "center" }}>Analyze another website</p>
                <p style={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.4)", textAlign: "center", lineHeight: 1.6 }}>Add a new website and run a real SEO crawl.</p>
                <Link href="/dashboard/add-website" style={{ background: "#0a0a0a", color: "#f2f1ed", fontWeight: 600, fontSize: "0.82rem", textDecoration: "none", padding: "10px 22px", borderRadius: 100 }}>
                  Add Website →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
