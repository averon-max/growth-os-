"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Opportunity {
  id: string;
  title: string;
  type: string;
  priority: string;
  score: number;
  reason: string;
  recommendation: string;
  affectedPages: number;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/websites")
      .then(r => r.json())
      .then(async data => {
        const latest = data.websites?.[0]?.analyses?.[0];
        if (latest?.id) {
          const res = await fetch(`/api/analyses/${latest.id}/opportunities`);
          const d = await res.json();
          setOpportunities(d.opportunities || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "#f2f1ed", minHeight: "100vh", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "20px 32px", background: "#fff" }}>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>Opportunities</p>
        <p style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.35)", margin: "2px 0 0" }}>{opportunities.length} opportunities found</p>
      </div>
      <div style={{ padding: "24px 32px" }}>
        {loading && <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.85rem" }}>Loading...</p>}
        {!loading && opportunities.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ color: "rgba(0,0,0,0.35)" }}>No opportunities yet. <Link href="/dashboard/add-website" style={{ color: "#d4a030" }}>Add a website →</Link></p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {opportunities.map(o => (
            <div key={o.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.08)", padding: "20px 24px", display: "flex", alignItems: "flex-start", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{o.title}</span>
                  <span style={{ fontSize: "0.62rem", fontFamily: "SF Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", color: o.priority === "HIGH" ? "#d4a030" : "rgba(0,0,0,0.3)" }}>{o.priority}</span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.45)", margin: "0 0 6px", lineHeight: 1.6 }}>{o.reason}</p>
                <p style={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.35)", margin: 0 }}>→ {o.recommendation}</p>
                <p style={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.3)", margin: "6px 0 0" }}>{o.affectedPages} page(s) affected</p>
              </div>
              <div style={{ fontFamily: "SF Mono, monospace", fontSize: "1.4rem", fontWeight: 800, color: "#d4a030", flexShrink: 0 }}>{o.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
