import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const ACCENT = "#5E6AD2";
const DARK = "#0A0A0B";

function LogoMark({ size = 18 }: { size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: 5, background: "#EDEDEF", flexShrink: 0 }} />;
}

const NAV_LINKS = ["Product", "Pricing", "Docs"];
const SWITCHER = ["SEO", "Keywords", "Opportunities", "Reports"];

export default function Home() {
  return (
    <div style={{ background: DARK, color: "#EDEDEF", fontFamily: "var(--font-inter), -apple-system, sans-serif", minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,11,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <LogoMark />
            <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fff" }}>Growth OS</span>
          </Link>
          <div style={{ display: "flex", gap: 28 }}>
            {NAV_LINKS.map((l) => (
              <Link key={l} href="#" style={{ color: "rgba(237,237,239,0.55)", fontSize: "0.82rem", textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/login" style={{ color: "rgba(237,237,239,0.55)", fontSize: "0.82rem", textDecoration: "none", padding: "6px 12px" }}>Log in</Link>
            <Link href="/signup" style={{ background: "#EDEDEF", color: DARK, fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", padding: "7px 14px", borderRadius: 6 }}>Sign up</Link>
          </div>
        </div>
      </nav>

      {/* HERO — flat Linear structure + a whisper of glow/particles, nothing more */}
      <section style={{ padding: "100px 24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 18 }}>SEO Intelligence Platform</p>
          <h1 style={{ fontSize: "clamp(2.6rem, 6vw, 4.6rem)", fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 20px" }}>
            SEO that fixes<br />itself.
          </h1>
          <p style={{ fontSize: "1.02rem", color: "rgba(237,237,239,0.5)", lineHeight: 1.6, margin: "0 auto 32px", maxWidth: 460 }}>
            Connect your site. Get a ranked list of real, evidence-backed fixes — not another audit PDF nobody reads.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 32 }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EDEDEF", color: DARK, fontWeight: 600, fontSize: "0.88rem", textDecoration: "none", padding: "10px 20px", borderRadius: 6 }}>
              Analyze my website <ArrowRight size={14} />
            </Link>
            <Link href="#how" style={{ display: "inline-flex", alignItems: "center", fontSize: "0.88rem", color: "#EDEDEF", textDecoration: "none", padding: "10px 18px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)" }}>
              How it works
            </Link>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {SWITCHER.map((t, i) => (
              <div key={t} style={{
                padding: "6px 14px", borderRadius: 100, fontSize: "0.76rem", fontWeight: 500,
                background: i === 0 ? "#17171A" : "transparent",
                color: i === 0 ? "#EDEDEF" : "rgba(237,237,239,0.4)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "56px auto 0" }}>
          <div style={{ borderRadius: "10px 10px 0 0", border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none", background: "#0F0F11", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["#F87171", "#FBBF24", "#34D399"].map((c) => <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, opacity: 0.6 }} />)}
              <span style={{ fontFamily: "monospace", fontSize: "0.65rem", color: "rgba(237,237,239,0.3)", marginLeft: 8 }}>growth-os.app/dashboard</span>
            </div>
            <div style={{ display: "flex", height: 320 }}>
              <div style={{ width: 150, background: "#0A0A0B", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "14px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
                {["Overview", "SEO", "Keywords", "Opportunities"].map((item, idx) => (
                  <div key={item} style={{ padding: "6px 10px", borderRadius: 5, fontSize: "0.7rem", background: idx === 0 ? "#17171A" : "transparent", color: idx === 0 ? "#EDEDEF" : "rgba(237,237,239,0.4)", borderLeft: idx === 0 ? `2px solid ${ACCENT}` : "2px solid transparent" }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                  {[{ v: "96", l: "SEO Score" }, { v: "4", l: "Opportunities" }, { v: "5", l: "Issues" }, { v: "1", l: "Pages" }].map((s) => (
                    <div key={s.l} style={{ background: "#0F0F11", borderRadius: 6, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "#EDEDEF", fontFamily: "monospace" }}>{s.v}</div>
                      <div style={{ fontSize: "0.6rem", color: "rgba(237,237,239,0.35)", marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#0F0F11", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  {[{ title: "Add meta descriptions", score: 85 }, { title: "Fix missing H1 tags", score: 91 }, { title: "Expand thin content", score: 72 }].map((o, i, arr) => (
                    <div key={o.title} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span style={{ fontSize: "0.7rem", color: "rgba(237,237,239,0.7)" }}>{o.title}</span>
                      <span style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "rgba(237,237,239,0.4)" }}>{o.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "90px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 44 }}>Three steps. No guesswork.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              { n: "01", title: "Connect", desc: "Link your website and Search Console." },
              { n: "02", title: "Crawl & analyze", desc: "Every page gets scored on real signals." },
              { n: "03", title: "Fix what matters", desc: "Ranked opportunities, not error dumps." },
            ].map((s) => (
              <div key={s.n}>
                <div style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(237,237,239,0.3)", marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: "0.82rem", color: "rgba(237,237,239,0.5)", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: "90px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 44 }}>One system. Every growth signal.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
            {[
              { title: "Website Intelligence", desc: "Continuous technical, content and indexation scanning." },
              { title: "Keyword Intelligence", desc: "Every keyword scored on demand, intent and ranking potential." },
              { title: "Opportunity Scoring", desc: "Prioritized by business impact, not error counts." },
              { title: "Security", desc: "Workspace isolation, encrypted tokens, server-side auth." },
            ].map((f) => (
              <div key={f.title} style={{ padding: "24px 22px", background: "#0F0F11" }}>
                <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 6, color: "#EDEDEF" }}>{f.title}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(237,237,239,0.5)", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "90px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 40 }}>Pricing</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
            {[
              { name: "Starter", price: 49, features: ["Website monitoring", "SEO analysis", "Keyword intelligence"] },
              { name: "Growth", price: 99, features: ["Everything in Starter", "Search Console integration", "Automations"] },
              { name: "Autopilot", price: 199, features: ["Everything in Growth", "Advanced automation", "Continuous optimization"] },
            ].map((p) => (
              <div key={p.name} style={{ background: "#0F0F11", padding: "28px 24px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 16 }}>{p.name}</div>
                <div style={{ marginBottom: 24 }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.03em" }}>${p.price}</span>
                  <span style={{ fontSize: "0.78rem", color: "rgba(237,237,239,0.4)", marginLeft: 4 }}>/mo</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "rgba(237,237,239,0.55)" }}>
                      <CheckCircle2 size={12} color="#22C55E" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" style={{ display: "block", textAlign: "center", padding: "9px", borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: "0.82rem", background: "rgba(255,255,255,0.06)", color: "#EDEDEF" }}>
                  Start Free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "90px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 24px" }}>
          Start improving today.
        </h2>
        <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EDEDEF", color: DARK, fontWeight: 600, fontSize: "0.88rem", textDecoration: "none", padding: "11px 22px", borderRadius: 6 }}>
          Get Started Free <ArrowRight size={14} />
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={16} />
            <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>Growth OS</span>
          </div>
          <span style={{ fontSize: "0.72rem", color: "rgba(237,237,239,0.3)" }}>© 2026 Growth OS</span>
        </div>
      </footer>
    </div>
  );
}
