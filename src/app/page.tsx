import Link from "next/link";
import { ArrowRight, TrendingUp, Zap, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export default function Home() {
  return (
    <div style={{ background: "#f2f1ed", color: "#0a0a0a", fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "0 48px", borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(242,241,237,0.92)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.03em" }}>SIGNAL</span>
          <div style={{ display: "flex", gap: 40 }}>
            {["Product", "Features", "Pricing"].map(l => (
              <Link key={l} href="#" style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.82rem", textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <Link href="/signup" style={{ background: "#0a0a0a", color: "#f2f1ed", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", padding: "10px 22px", borderRadius: 100 }}>Get Started →</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 160, paddingBottom: 0, paddingLeft: 48, paddingRight: 48 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 48 }}>
            <span style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.35)", fontFamily: "SF Mono, monospace" }}>— Website Growth Platform</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "end" }}>
            <h1 style={{ fontSize: "clamp(4rem, 9vw, 8.5rem)", fontWeight: 800, lineHeight: 0.92, letterSpacing: "-0.045em", margin: 0 }}>
              Your<br />
              <em style={{ fontStyle: "italic", color: "#d4a030", WebkitTextStroke: "0px" }}>website,</em><br />
              <span style={{ color: "rgba(0,0,0,0.2)" }}>cont-</span><br />
              <span style={{ color: "rgba(0,0,0,0.2)" }}>inuously</span><br />
              improved.
            </h1>

            <div style={{ paddingBottom: 20 }}>
              <p style={{ fontSize: "1.05rem", color: "rgba(0,0,0,0.45)", lineHeight: 1.75, marginBottom: 36, maxWidth: 380 }}>
                Find what is holding your website back. Fix what matters. Keep growing — automatically.
              </p>
              <div style={{ display: "flex", gap: 10, marginBottom: 60 }}>
                <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0a0a0a", color: "#f2f1ed", fontWeight: 600, fontSize: "0.88rem", textDecoration: "none", padding: "14px 26px", borderRadius: 100 }}>
                  Analyze My Website <ArrowRight size={15} />
                </Link>
                <Link href="#how" style={{ display: "inline-flex", alignItems: "center", fontSize: "0.88rem", color: "rgba(0,0,0,0.45)", textDecoration: "none", padding: "14px 22px", borderRadius: 100, border: "1px solid rgba(0,0,0,0.12)" }}>
                  See How It Works
                </Link>
              </div>

              {/* MINI DASHBOARD */}
              <div style={{ borderRadius: 16, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#fafaf8" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {["#e5e5e5","#e5e5e5","#e5e5e5"].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
                  </div>
                  <span style={{ fontFamily: "SF Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.12em", color: "rgba(0,0,0,0.25)", textTransform: "uppercase" }}>acme-hardware.com</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4caf7d" }} />
                    <span style={{ fontFamily: "SF Mono, monospace", fontSize: "0.58rem", color: "rgba(0,0,0,0.2)" }}>Live</span>
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
                    {[{ v: "+24%", l: "Organic" }, { v: "12", l: "Opportunities" }, { v: "84", l: "SEO Score" }, { v: "8", l: "Rising kws" }].map(s => (
                      <div key={s.l} style={{ background: "#f8f8f6", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.03em", color: "#d4a030" }}>{s.v}</div>
                        <div style={{ fontSize: "0.6rem", color: "rgba(0,0,0,0.35)", marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <svg viewBox="0 0 400 70" style={{ width: "100%", marginBottom: 14 }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d4a030" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#d4a030" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,60 L45,55 L90,58 L135,45 L180,48 L225,33 L270,36 L315,22 L360,14 L400,10 L400,70 L0,70 Z" fill="url(#g2)" />
                    <path d="M0,60 L45,55 L90,58 L135,45 L180,48 L225,33 L270,36 L315,22 L360,14 L400,10" fill="none" stroke="#d4a030" strokeWidth="1.5" />
                  </svg>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { l: "Emergency service page", impact: "High" },
                      { l: "Mobile CTA visibility", impact: "High" },
                      { l: "Water heater content", impact: "Med" },
                    ].map(o => (
                      <div key={o.l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8f8f6", borderRadius: 8, padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Zap size={11} color="#d4a030" />
                          <span style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.6)" }}>{o.l}</span>
                        </div>
                        <span style={{ fontFamily: "SF Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.08em", color: o.impact === "High" ? "#d4a030" : "rgba(0,0,0,0.25)", textTransform: "uppercase" }}>{o.impact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLACK STRIP */}
      <div style={{ background: "#0a0a0a", margin: "80px 0 0", padding: "20px 48px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", gap: 60, overflowX: "auto" }}>
          {["SEO Analysis", "Keyword Intelligence", "Content Engine", "Competitor Monitoring", "Automation", "Opportunity Scoring", "Audience Behavior", "Feedback Loop"].map((t, i) => (
            <span key={i} style={{ fontFamily: "SF Mono, monospace", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* NUMBERS */}
      <section style={{ padding: "80px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[
            { n: "+24%", l: "Average organic traffic increase" },
            { n: "12", l: "Opportunities found per website" },
            { n: "84", l: "Average SEO health score" },
            { n: "4×", l: "Faster than manual optimization" },
          ].map((s, i) => (
            <div key={s.n} style={{ padding: "32px", borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.08)" : "none" }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 10, color: i === 0 ? "#d4a030" : "#0a0a0a" }}>{s.n}</div>
              <div style={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.38)", lineHeight: 1.55, maxWidth: 160 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "100px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "start" }}>
          <div>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 28, fontFamily: "SF Mono, monospace" }}>— How it works</div>
            <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em", margin: 0 }}>
              Analyze.<br />
              <span style={{ color: "#d4a030", fontStyle: "italic" }}>Prioritize.</span><br />
              Execute.<br />
              Measure.
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { n: "01", title: "Connect your website", desc: "Link your website, Google Search Console and analytics in minutes." },
              { n: "02", title: "Continuous analysis", desc: "The system scans your site, keywords, audience and competitors every day." },
              { n: "03", title: "Priority opportunities", desc: "Every opportunity is scored by impact. You know exactly what to fix first." },
              { n: "04", title: "Execute and measure", desc: "Apply changes. Every result feeds back into the next priority list." },
            ].map((s, i) => (
              <div key={s.n} style={{ display: "flex", gap: 28, padding: "28px 0", borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.07)" : "none" }}>
                <div style={{ fontFamily: "SF Mono, monospace", fontSize: "0.62rem", color: "rgba(0,0,0,0.2)", paddingTop: 3, minWidth: 24 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "rgba(0,0,0,0.4)", lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ padding: "80px 48px 48px" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 24, fontFamily: "SF Mono, monospace" }}>— Features</div>
            <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.95, margin: 0 }}>One system.<br />Every growth signal.</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            {[
              { title: "Website Intelligence", desc: "Continuous scanning of technical SEO, content quality, internal linking, performance and indexation.", tag: "Always on", accent: false },
              { title: "Keyword Intelligence", desc: "Every keyword scored on demand, competition, intent and ranking potential. Not just listed — prioritized.", tag: "Proprietary scoring", accent: true },
              { title: "Content Engine", desc: "See exactly what content is missing. Compare against competitors and search demand before creating anything.", tag: "Data-driven", accent: false },
              { title: "Audience Behavior", desc: "Scroll depth, CTA interaction, exit points and conversion paths — what happens when visitors arrive.", tag: "Real sessions", accent: false },
              { title: "Competitor Intelligence", desc: "28 topics covered by competitors but missing from your site. Know what ground to take.", tag: "Live comparison", accent: false },
              { title: "Automation", desc: "Metadata, schema, internal links applied automatically. High-impact changes queued for your approval.", tag: "Autopilot + Review", accent: false },
            ].map((f, i) => (
              <div key={f.title} style={{ padding: "40px 36px", borderRight: (i + 1) % 3 !== 0 ? "1px solid rgba(0,0,0,0.08)" : "none", borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.08)" : "none", background: f.accent ? "#0a0a0a" : "transparent" }}>
                <div style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: f.accent ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.28)", fontFamily: "SF Mono, monospace", marginBottom: 20 }}>{f.tag}</div>
                <div style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em", marginBottom: 12, color: f.accent ? "#f2f1ed" : "#0a0a0a" }}>{f.title}</div>
                <div style={{ fontSize: "0.82rem", color: f.accent ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.42)", lineHeight: 1.7 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WEBSITE HEALTH */}
      <section style={{ padding: "100px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 28, fontFamily: "SF Mono, monospace" }}>— Website Intelligence</div>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 20 }}>Know exactly what is happening.</h2>
            <p style={{ fontSize: "0.88rem", color: "rgba(0,0,0,0.42)", lineHeight: 1.75 }}>The system continuously maps your website and detects changes, weaknesses and opportunities — not a one-time audit.</p>
          </div>
          <div style={{ borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
              {[
                { label: "Technical SEO", s: "ok" }, { label: "Content quality", s: "warn" }, { label: "Internal linking", s: "warn" },
                { label: "Page structure", s: "ok" }, { label: "Performance", s: "ok" }, { label: "Mobile", s: "ok" },
                { label: "Indexation", s: "error" }, { label: "Schema", s: "warn" }, { label: "Broken links", s: "error" },
              ].map(c => (
                <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  {c.s === "ok" && <CheckCircle2 size={13} color="#4caf7d" />}
                  {c.s === "warn" && <AlertTriangle size={13} color="#d4a030" />}
                  {c.s === "error" && <XCircle size={13} color="#d97a6c" />}
                  <span style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.5)" }}>{c.label}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", background: "#fafaf8" }}>
              <span style={{ fontSize: "0.68rem", color: "rgba(0,0,0,0.28)", fontFamily: "SF Mono, monospace" }}>214 pages · 6 min ago</span>
              <span style={{ fontSize: "0.68rem", color: "#d4a030", fontFamily: "SF Mono, monospace", fontWeight: 600 }}>6 issues found</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "100px 48px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(0,0,0,0.3)", marginBottom: 20, fontFamily: "SF Mono, monospace" }}>— Pricing</div>
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.95, marginBottom: 80 }}>Simple plans.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 20, overflow: "hidden" }}>
            {[
              { name: "Starter", price: 49, features: ["Website monitoring", "SEO analysis", "Keyword intelligence", "Opportunity tracking", "Monthly reports"], pop: false },
              { name: "Growth", price: 99, features: ["Everything in Starter", "Search Console integration", "Audience analytics", "Content opportunities", "Competitor monitoring", "Automations"], pop: true },
              { name: "Autopilot", price: 199, features: ["Everything in Growth", "Advanced automation", "Content workflows", "Advanced competitors", "Continuous optimization"], pop: false },
            ].map((p, i) => (
              <div key={p.name} style={{ padding: "40px 36px", borderLeft: i > 0 ? "1px solid rgba(0,0,0,0.08)" : "none", background: p.pop ? "#0a0a0a" : "#fff", display: "flex", flexDirection: "column" }}>
                {p.pop && <div style={{ fontFamily: "SF Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "#d4a030", marginBottom: 16 }}>— Most popular</div>}
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 20, color: p.pop ? "#f2f1ed" : "#0a0a0a", letterSpacing: "-0.02em" }}>{p.name}</div>
                <div style={{ marginBottom: 32 }}>
                  <span style={{ fontSize: "3.2rem", fontWeight: 800, letterSpacing: "-0.05em", color: p.pop ? "#f2f1ed" : "#0a0a0a" }}>${p.price}</span>
                  <span style={{ fontSize: "0.78rem", color: p.pop ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)", marginLeft: 6 }}>/month</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.8rem", color: p.pop ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)" }}>
                      <span style={{ color: p.pop ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)" }}>—</span> {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" style={{ display: "block", textAlign: "center", padding: "13px", borderRadius: 100, textDecoration: "none", fontWeight: 600, fontSize: "0.82rem", background: p.pop ? "#d4a030" : "#0a0a0a", color: p.pop ? "#0a0a0a" : "#f2f1ed" }}>
                  Start Free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "140px 48px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(3rem, 8vw, 7.5rem)", fontWeight: 800, lineHeight: 0.92, letterSpacing: "-0.045em", maxWidth: 1000, marginBottom: 60 }}>
            Your website should<br />
            <span style={{ color: "#d4a030", fontStyle: "italic" }}>never</span> stop improving.
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#0a0a0a", color: "#f2f1ed", fontWeight: 600, fontSize: "0.92rem", textDecoration: "none", padding: "16px 32px", borderRadius: 100 }}>
              Start Free — it takes 2 minutes <ArrowRight size={16} />
            </Link>
            <span style={{ fontSize: "0.78rem", color: "rgba(0,0,0,0.3)" }}>No credit card required</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: "32px 48px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, fontSize: "0.9rem", letterSpacing: "-0.02em" }}>SIGNAL</span>
          <div style={{ display: "flex", gap: 32 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <Link key={l} href="#" style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.28)", textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <span style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.22)" }}>© 2026 Signal</span>
        </div>
      </footer>
    </div>
  );
}
