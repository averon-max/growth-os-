import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PricingPage() {
  return (
    <div style={{ background: "#f2f1ed", minHeight: "100vh", fontFamily: "-apple-system, 'SF Pro Display', sans-serif", color: "#0a0a0a" }}>
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "0 48px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(242,241,237,0.92)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.03em", textDecoration: "none", color: "#0a0a0a" }}>SIGNAL</Link>
          <Link href="/signup" style={{ background: "#0a0a0a", color: "#f2f1ed", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", padding: "10px 22px", borderRadius: 100 }}>Get Started →</Link>
        </div>
      </nav>

      <div style={{ paddingTop: 140, paddingBottom: 100, paddingLeft: 48, paddingRight: 48, maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 20, fontFamily: "SF Mono, monospace" }}>— Pricing</div>
        <h1 style={{ fontSize: "clamp(3rem, 7vw, 6rem)", fontWeight: 800, letterSpacing: "-0.045em", lineHeight: 0.95, marginBottom: 24 }}>
          Simple plans.<br />
          <span style={{ color: "#d4a030", fontStyle: "italic" }}>Real growth.</span>
        </h1>
        <p style={{ fontSize: "1rem", color: "rgba(0,0,0,0.4)", marginBottom: 80, maxWidth: 400, lineHeight: 1.7 }}>Start free, upgrade as your website grows. No credit card required.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 20, overflow: "hidden" }}>
          {[
            { name: "Starter", price: 49, features: ["Website monitoring", "SEO analysis", "Keyword intelligence", "Opportunity tracking", "Monthly reports"], pop: false },
            { name: "Growth", price: 99, features: ["Everything in Starter", "Search Console integration", "Audience analytics", "Content opportunities", "Competitor monitoring", "Automations"], pop: true },
            { name: "Autopilot", price: 199, features: ["Everything in Growth", "Advanced automation", "Content workflows", "Advanced competitors", "Continuous optimization", "Priority processing"], pop: false },
          ].map((p, i) => (
            <div key={p.name} style={{ padding: "48px 40px", borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.08)" : "none", background: p.pop ? "#0a0a0a" : "#fff", display: "flex", flexDirection: "column" }}>
              {p.pop && <div style={{ fontFamily: "SF Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#d4a030", marginBottom: 16 }}>— Most popular</div>}
              <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: 24, color: p.pop ? "#f2f1ed" : "#0a0a0a", letterSpacing: "-0.02em" }}>{p.name}</div>
              <div style={{ marginBottom: 36 }}>
                <span style={{ fontSize: "4rem", fontWeight: 800, letterSpacing: "-0.05em", color: p.pop ? "#f2f1ed" : "#0a0a0a", lineHeight: 1 }}>${p.price}</span>
                <span style={{ fontSize: "0.82rem", color: p.pop ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)", marginLeft: 8 }}>/month</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: p.pop ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)" }}>
                    <span style={{ color: p.pop ? "#d4a030" : "rgba(0,0,0,0.2)" }}>—</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/signup" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 100, textDecoration: "none", fontWeight: 600, fontSize: "0.85rem", background: p.pop ? "#d4a030" : "#0a0a0a", color: p.pop ? "#0a0a0a" : "#f2f1ed" }}>
                Start Free <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
