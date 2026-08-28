import Link from "next/link";
import { ArrowRight, Zap, TrendingUp, BarChart2, Search, Globe, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Home() {
  return (
    <div style={{
      background: "#0A0A0B",
      color: "#E2E2E5",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: "100vh",
      WebkitFontSmoothing: "antialiased",
    }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,10,11,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect width="20" height="20" rx="5" fill="#5B6AD0"/>
                <path d="M5 10.5L8.5 14L15 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#F0F0F3", letterSpacing: "-0.02em" }}>Growth OS</span>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["Features", "Changelog", "Pricing", "Docs"].map(l => (
                <Link key={l} href="#" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", textDecoration: "none", fontWeight: 400, transition: "color 0.15s" }}>{l}</Link>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/login" style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", textDecoration: "none", padding: "7px 14px" }}>Log in</Link>
            <Link href="/signup" style={{ background: "#5B6AD0", color: "#fff", fontSize: "0.82rem", fontWeight: 500, textDecoration: "none", padding: "7px 16px", borderRadius: 6, letterSpacing: "-0.01em" }}>Sign up</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 160, paddingBottom: 120, paddingLeft: 32, paddingRight: 32 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(91,106,208,0.12)", border: "1px solid rgba(91,106,208,0.25)", borderRadius: 100, padding: "4px 10px 4px 6px" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(91,106,208,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5B6AD0" }} />
              </div>
              <span style={{ fontSize: "0.72rem", color: "#8B95E0", fontWeight: 500, letterSpacing: "0.01em" }}>Now available — v1.0</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 80, alignItems: "start" }}>
            <div>
              <h1 style={{
                fontSize: "clamp(3rem, 5.5vw, 4.8rem)",
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: "-0.045em",
                margin: "0 0 28px",
                color: "#F0F0F3",
              }}>
                SEO intelligence<br />
                for teams that<br />
                <span style={{ color: "#5B6AD0" }}>ship fast.</span>
              </h1>

              <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.7, marginBottom: 40, maxWidth: 440 }}>
                Growth OS crawls your website, detects what is holding back organic growth, and surfaces the highest-impact opportunities — with evidence, not guesses.
              </p>

              <div style={{ display: "flex", gap: 10, marginBottom: 48 }}>
                <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#5B6AD0", color: "#fff", fontWeight: 500, fontSize: "0.85rem", textDecoration: "none", padding: "10px 20px", borderRadius: 7, letterSpacing: "-0.01em" }}>
                  Get started free <ArrowRight size={14} />
                </Link>
                <Link href="#how" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", textDecoration: "none", padding: "10px 18px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)" }}>
                  See how it works
                </Link>
              </div>

              <div style={{ display: "flex", gap: 20, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  { n: "96", l: "avg SEO score" },
                  { n: "12", l: "opportunities/site" },
                  { n: "28d", l: "to first results" },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#F0F0F3", letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums" }}>{s.n}</div>
                    <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* MINI APP */}
            <div style={{ background: "#111114", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden", boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 32px 80px rgba(0,0,0,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                {["#FF5F57","#FFBD2E","#28CA41"].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: 0.8 }} />)}
                <span style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", marginLeft: 8 }}>growth-os — Overview</span>
              </div>
              <div style={{ display: "flex", height: 320 }}>
                <div style={{ width: 140, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
                  {[
                    { label: "Overview", active: true },
                    { label: "SEO Issues", active: false },
                    { label: "Keywords", active: false },
                    { label: "Opportunities", active: false },
                    { label: "Content", active: false },
                    { label: "Competitors", active: false },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: "6px 10px", borderRadius: 5,
                      background: item.active ? "rgba(91,106,208,0.15)" : "transparent",
                      color: item.active ? "#8B95E0" : "rgba(255,255,255,0.3)",
                      fontSize: "0.72rem",
                      fontWeight: item.active ? 500 : 400,
                      borderLeft: item.active ? "2px solid #5B6AD0" : "2px solid transparent",
                    }}>
                      {item.label}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, padding: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                    {[
                      { v: "96", l: "Score", color: "#4ADE80" },
                      { v: "4", l: "Opportunities", color: "#5B6AD0" },
                      { v: "5", l: "Issues", color: "#FB923C" },
                      { v: "1", l: "Pages", color: "rgba(255,255,255,0.3)" },
                    ].map(s => (
                      <div key={s.l} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 7, padding: "10px 10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.03em", color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
                        <div style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.25)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}>
                    <div style={{ padding: "7px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Opportunities</span>
                    </div>
                    {[
                      { title: "Expand thin content", priority: "MED", score: 72 },
                      { title: "Add meta descriptions", priority: "HIGH", score: 85 },
                      { title: "Fix missing H1 tags", priority: "HIGH", score: 91 },
                    ].map(o => (
                      <div key={o.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: o.priority === "HIGH" ? "#FB923C" : "#FCD34D", flexShrink: 0 }} />
                          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>{o.title}</span>
                        </div>
                        <span style={{ fontSize: "0.65rem", fontVariantNumeric: "tabular-nums", color: "#5B6AD0", fontWeight: 600 }}>{o.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "16px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 48, paddingLeft: 32 }}>
          {["Real crawler", "SSRF protection", "Workspace isolation", "Evidence-based issues", "Keyword signals", "GSC integration", "Opportunity scoring", "Historical tracking", "No fake data"].map((t) => (
            <span key={t} style={{ fontFamily: "monospace", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "120px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 80 }}>
            <div>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#5B6AD0", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>How it works</p>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, letterSpacing: "-0.04em", color: "#F0F0F3", lineHeight: 1.15, margin: "0 0 20px" }}>
                From crawl to action in minutes.
              </h2>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>
                No manual audits. No spreadsheets. Just real signals from your actual website.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { n: "01", title: "Connect your website", desc: "Add your domain. Growth OS validates it and sets up the crawler. Takes 30 seconds.", tag: "Setup" },
                { n: "02", title: "Real-time crawl", desc: "The crawler maps your site structure, extracts metadata, detects issues with evidence — not assumptions.", tag: "Analysis" },
                { n: "03", title: "Scored opportunities", desc: "Each opportunity is ranked by expected business impact. High-value pages get higher priority.", tag: "Intelligence" },
                { n: "04", title: "Connect data sources", desc: "Add Google Search Console for keyword data. Every signal is traceable to its source.", tag: "Integration" },
              ].map((s, i) => (
                <div key={s.n} style={{ display: "flex", gap: 24, padding: "24px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div style={{ minWidth: 32 }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(255,255,255,0.2)" }}>{s.n}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#F0F0F3", letterSpacing: "-0.02em" }}>{s.title}</span>
                      <span style={{ fontSize: "0.6rem", color: "#5B6AD0", background: "rgba(91,106,208,0.12)", padding: "2px 7px", borderRadius: 4, fontWeight: 500 }}>{s.tag}</span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section style={{ padding: "120px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#5B6AD0", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Capabilities</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, letterSpacing: "-0.04em", color: "#F0F0F3", margin: 0 }}>
              Built for how SEO actually works.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, overflow: "hidden" }}>
            {[
              { title: "Technical SEO", desc: "Title length, meta descriptions, canonicals, robots directives, H1 structure — each with exact evidence.", icon: <Search size={16} />, accent: false },
              { title: "Crawler engine", desc: "Real HTTP crawl with SSRF protection. Handles redirects, extracts JSON-LD, OpenGraph, internal links.", icon: <Globe size={16} />, accent: true },
              { title: "SEO scoring", desc: "Explainable scores across Technical, Content, Structure and Indexability. Not a black box.", icon: <BarChart2 size={16} />, accent: false },
              { title: "Keyword signals", desc: "Quick wins, declining keywords, high impression/low CTR — detected from real GSC data.", icon: <TrendingUp size={16} />, accent: false },
              { title: "Opportunity engine", desc: "Every finding becomes an opportunity with a score, evidence, and a recommended action.", icon: <Zap size={16} />, accent: false },
              { title: "Workspace isolation", desc: "IDOR-tested. Server-side ownership checks on every resource. Cross-tenant access is impossible.", icon: <CheckCircle2 size={16} />, accent: false },
            ].map((f) => (
              <div key={f.title} style={{
                padding: "28px 24px",
                background: f.accent ? "rgba(91,106,208,0.08)" : "#0A0A0B",
              }}>
                <div style={{ color: f.accent ? "#8B95E0" : "rgba(255,255,255,0.3)", marginBottom: 14 }}>{f.icon}</div>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#F0F0F3", marginBottom: 8, letterSpacing: "-0.02em" }}>{f.title}</div>
                <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.33)", lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO HEALTH DEMO */}
      <section style={{ padding: "120px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#5B6AD0", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>Website analysis</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, letterSpacing: "-0.04em", color: "#F0F0F3", lineHeight: 1.15, marginBottom: 20 }}>
              Every issue has evidence.
            </h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 32 }}>
              Growth OS never says "your SEO is bad." It says "title is 91 characters — recommended maximum is 60 — here is the exact title."
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Evidence on every issue — not just a description",
                "Severity tiers: CRITICAL → HIGH → MEDIUM → LOW",
                "Specific recommendation per issue",
              ].map(t => (
                <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(91,106,208,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#5B6AD0" }} />
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#111114", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>SEO Issues</span>
              <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#4ADE80" }}>Score: 96</span>
            </div>
            {[
              { severity: "HIGH", type: "TITLE_TOO_LONG", desc: "Title is 91 characters. Max recommended: 60.", page: "/services/emergency-plumbing" },
              { severity: "MEDIUM", type: "MISSING_META", desc: "Meta description is absent.", page: "/about" },
              { severity: "MEDIUM", type: "THIN_CONTENT", desc: "Word count: 180. Recommended minimum: 300.", page: "/contact" },
              { severity: "LOW", type: "MISSING_ALT", desc: "3 images missing alt attributes.", page: "/gallery" },
            ].map((issue, i) => (
              <div key={issue.type} style={{ padding: "12px 16px", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.08em",
                    color: issue.severity === "HIGH" ? "#FB923C" : issue.severity === "MEDIUM" ? "#5B6AD0" : "rgba(255,255,255,0.3)",
                    background: issue.severity === "HIGH" ? "rgba(251,146,60,0.1)" : issue.severity === "MEDIUM" ? "rgba(91,106,208,0.1)" : "rgba(255,255,255,0.04)",
                    padding: "2px 6px", borderRadius: 3,
                  }}>{issue.severity}</span>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{issue.desc}</span>
                </div>
                <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>{issue.page}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "120px 32px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 56 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "#5B6AD0", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Pricing</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", fontWeight: 700, letterSpacing: "-0.04em", color: "#F0F0F3", margin: "0 0 8px" }}>Straightforward pricing.</h2>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", margin: 0 }}>Free to start. Upgrade when it pays for itself.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { name: "Starter", price: 49, desc: "For solo operators and small sites.", features: ["1 website", "SEO analysis", "Opportunity scoring", "Monthly crawl"], pop: false },
              { name: "Growth", price: 99, desc: "For teams serious about organic growth.", features: ["5 websites", "Everything in Starter", "Search Console sync", "Keyword signals", "Competitor monitoring", "Weekly crawl"], pop: true },
              { name: "Scale", price: 199, desc: "For agencies and large sites.", features: ["25 websites", "Everything in Growth", "Daily crawl", "API access", "Priority support"], pop: false },
            ].map((p) => (
              <div key={p.name} style={{
                padding: "28px 24px",
                borderRadius: 10,
                background: p.pop ? "rgba(91,106,208,0.08)" : "rgba(255,255,255,0.02)",
                border: p.pop ? "1px solid rgba(91,106,208,0.3)" : "1px solid rgba(255,255,255,0.06)",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem", color: p.pop ? "#8B95E0" : "rgba(255,255,255,0.6)", marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.28)", lineHeight: 1.4 }}>{p.desc}</div>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.05em", color: "#F0F0F3", fontVariantNumeric: "tabular-nums" }}>${p.price}</span>
                  <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", marginLeft: 4 }}>/mo</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.pop ? "#5B6AD0" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 7, textDecoration: "none", fontWeight: 500, fontSize: "0.82rem", background: p.pop ? "#5B6AD0" : "rgba(255,255,255,0.06)", color: "#fff", letterSpacing: "-0.01em" }}>
                  Start free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "160px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 700, lineHeight: 1.06, letterSpacing: "-0.045em", color: "#F0F0F3", margin: "0 0 24px" }}>
              Your website deserves better than a one-time audit.
            </h2>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, marginBottom: 40 }}>
              Continuous analysis. Evidence-based issues. Prioritized by impact. Start in under 2 minutes.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#5B6AD0", color: "#fff", fontWeight: 500, fontSize: "0.85rem", textDecoration: "none", padding: "10px 20px", borderRadius: 7 }}>
                Get started free <ArrowRight size={14} />
              </Link>
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.2)" }}>No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <rect width="20" height="20" rx="5" fill="#5B6AD0"/>
              <path d="M5 10.5L8.5 14L15 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", letterSpacing: "-0.01em" }}>Growth OS</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Status", "Contact"].map(l => (
              <Link key={l} href="#" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.22)", textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.15)" }}>© 2026 Growth OS</span>
        </div>
      </footer>

    </div>
  );
}
