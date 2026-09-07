import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

function LogoMark({ size = 18 }: { size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: 5, background: "var(--primary)", flexShrink: 0 }} />;
}

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "/pricing" },
];

const FEATURE_BLOCKS = [
  {
    kicker: "Fix pipeline",
    title: "Fixes ship themselves",
    desc: "Connect WordPress or your CMS and Growth OS applies approved fixes directly — canonical tags, meta descriptions, structured data — then re-crawls to confirm the issue is actually gone.",
    mock: "issues",
  },
  {
    kicker: "Content",
    title: "Briefs grounded in real demand",
    desc: "Content briefs pull from your actual keyword data — volume, competition, and what's already ranking nearby — not generic topic guesses.",
    mock: "keywords",
  },
  {
    kicker: "Research",
    title: "Find demand before you write a word",
    desc: "Real search volume, CPC, and difficulty from DataForSEO, aggressively cached so repeat lookups cost nothing — plus completely free daily trending signals from Google Trends layered on top.",
    mock: "trends",
  },
] as const;

const SMALL_CARDS = [
  { title: "Always watching", desc: "Daily crawls catch regressions before they cost you a ranking." },
  { title: "Keyword signals", desc: "Quick wins, decline alerts, and cannibalization — surfaced automatically." },
  { title: "One workspace, every site", desc: "Switch between properties without losing your place." },
];

const WORKFLOW_STEPS = [
  { n: "01", title: "Connect", desc: "Link Search Console and your CMS. Growth OS starts crawling and pulling ranking data immediately." },
  { n: "02", title: "Review", desc: "Every proposed fix and generated brief waits for your approval before it touches your live site." },
  { n: "03", title: "Verify", desc: "After a fix ships, Growth OS re-checks the page and logs the result — no fix is marked done on faith." },
];

const STATS = [
  { v: "6", l: "keyword signal types tracked automatically" },
  { v: "28d", l: "rolling window on every ranking check" },
  { v: "<1min", l: "to connect Search Console and start crawling" },
  { v: "100%", l: "of applied fixes re-verified against the live page" },
];

function GlowOrb() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: -120,
        left: "50%",
        transform: "translateX(-50%)",
        width: 640,
        height: 420,
        background: "radial-gradient(closest-side, rgba(94,106,210,0.16), transparent 72%)",
        filter: "blur(10px)",
        pointerEvents: "none",
      }}
    />
  );
}

function ScreenChrome({ label, dot, children, featured = false }: { label: string; dot?: string; children: React.ReactNode; featured?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${featured ? "var(--border-strong)" : "var(--border)"}`,
        borderTop: featured ? "2px solid var(--accent)" : `1px solid ${featured ? "var(--border-strong)" : "var(--border)"}`,
        background: featured ? "var(--surface)" : "var(--elevated)",
        overflow: "hidden",
        height: "100%",
        boxShadow: featured ? "0 40px 90px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.02)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 16px 11px", borderBottom: "1px solid var(--border)" }}>
        {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
        <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "var(--secondary)" }}>{label}</span>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function KeywordStatsCard() {
  const chips = ["identity verification api", "kyc software", "aml screening tool", "biometric verification"];
  const rows = [
    { kw: "identity verification api", vol: "2,900", trend: "+142%", diff: 38, cpc: "$6.40" },
    { kw: "kyc automation software", vol: "1,600", trend: "+64%", diff: 44, cpc: "$5.10" },
    { kw: "aml screening tool", vol: "720", trend: "+21%", diff: 31, cpc: "$8.90" },
    { kw: "biometric verification", vol: "590", trend: "-8%", diff: 27, cpc: "$3.75" },
  ];
  return (
    <ScreenChrome label="Keyword ideas" dot="var(--accent)" featured>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
        {chips.map((c, idx) => (
          <span key={c} style={{ fontSize: "0.68rem", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-strong)", color: "var(--secondary)" }}>
            {idx + 1}. {c}
          </span>
        ))}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
        <thead>
          <tr>
            {["Keyword", "Volume", "Trend", "Difficulty", "CPC"].map((h) => (
              <th key={h} style={{ textAlign: "left", color: "var(--muted)", fontWeight: 500, fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.05em", paddingBottom: 9 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kw} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "9px 0", color: "var(--primary)" }}>{r.kw}</td>
              <td style={{ padding: "9px 0", color: "var(--secondary)", fontFamily: "var(--font-mono)" }}>{r.vol}</td>
              <td style={{ padding: "9px 0", color: r.trend.startsWith("-") ? "var(--danger)" : "var(--success)" }}>{r.trend}</td>
              <td style={{ padding: "9px 0", color: "var(--secondary)", fontFamily: "var(--font-mono)" }}>{r.diff}</td>
              <td style={{ padding: "9px 0", color: "var(--secondary)", fontFamily: "var(--font-mono)" }}>{r.cpc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScreenChrome>
  );
}

function OverviewStatsCard() {
  const tiles = [
    { v: "1,284", l: "keywords tracked" },
    { v: "37", l: "quick wins found" },
    { v: "6", l: "signal types" },
    { v: "$4.82", l: "avg. CPC" },
  ];
  return (
    <ScreenChrome label="Overview" dot="var(--primary)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tiles.map((t) => (
          <div key={t.l}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--primary)" }}>{t.v}</div>
            <div style={{ fontSize: "0.66rem", color: "var(--secondary)", marginTop: 3 }}>{t.l}</div>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}

function SignalsCard() {
  const signals = [
    { label: "Quick win", count: 12, tone: "var(--success)" },
    { label: "Growing", count: 9, tone: "var(--success)" },
    { label: "Declining", count: 4, tone: "var(--warning)" },
    { label: "High impressions, low CTR", count: 6, tone: "var(--warning)" },
    { label: "Cannibalization", count: 3, tone: "var(--danger)" },
    { label: "Lost", count: 2, tone: "var(--danger)" },
  ];
  return (
    <ScreenChrome label="Keyword signals" dot="var(--success)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px" }}>
        {signals.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "6px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.74rem", color: "var(--secondary)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.tone, flexShrink: 0 }} />
              {s.label}
            </div>
            <span style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", color: "var(--primary)" }}>{s.count}</span>
          </div>
        ))}
      </div>
    </ScreenChrome>
  );
}

function IssuesCard() {
  const issues = [
    { code: "MISSING_META_DESCRIPTION", tone: "var(--danger)" },
    { code: "THIN_CONTENT", tone: "var(--warning)" },
  ];
  return (
    <ScreenChrome label="Issues" dot="var(--warning)">
      {issues.map((row, i, arr) => (
        <div key={row.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.tone, flexShrink: 0 }} />
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--secondary)" }}>{row.code}</span>
        </div>
      ))}
    </ScreenChrome>
  );
}

function CmsCard() {
  return (
    <ScreenChrome label="CMS" dot="var(--muted)">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.76rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)" }} />
          <span style={{ fontWeight: 500, color: "var(--primary)" }}>scanmycreds.com</span>
        </div>
        <span style={{ color: "var(--primary)", fontWeight: 500, borderBottom: "1px solid var(--border-strong)" }}>Connect →</span>
      </div>
    </ScreenChrome>
  );
}

function MiniMock({ variant }: { variant: "issues" | "keywords" | "trends" }) {
  if (variant === "issues") {
    return (
      <div style={{ border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--elevated)", padding: 16 }}>
        {[
          { code: "MISSING_META_DESCRIPTION", tone: "var(--primary)" },
          { code: "THIN_CONTENT", tone: "var(--muted)" },
          { code: "MISSING_CANONICAL", tone: "var(--muted)" },
        ].map((row, i, arr) => (
          <div key={row.code} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: row.tone, flexShrink: 0 }} />
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--secondary)" }}>{row.code}</span>
          </div>
        ))}
      </div>
    );
  }
  if (variant === "trends") {
    const chips = ["identity verification api", "kyc software", "biometric verification"];
    return (
      <div style={{ border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--elevated)", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: "0.66rem", fontWeight: 600, color: "var(--success)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
          free — Google Trends
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {chips.map((c, idx) => (
            <span key={c} style={{ fontSize: "0.7rem", padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", color: "var(--secondary)" }}>
              {idx + 1}. {c}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--elevated)", padding: 16 }}>
      {[
        { kw: "background check api", vol: "1,400" },
        { kw: "identity verification saas", vol: "880" },
        { kw: "kyc automation tools", vol: "590" },
      ].map((row, i, arr) => (
        <div key={row.kw} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--primary)" }}>{row.kw}</span>
          <span style={{ fontSize: "0.68rem", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{row.vol}</span>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ background: "var(--background)", color: "var(--primary)", fontFamily: "var(--font-body, var(--font-inter)), -apple-system, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(19,19,22,0.78)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <LogoMark />
            <span style={{ fontWeight: 700, fontSize: "0.9rem", letterSpacing: "-0.01em", color: "var(--primary)" }}>Growth OS</span>
          </Link>
          <div style={{ display: "flex", gap: 30 }}>
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} style={{ color: "var(--secondary)", fontSize: "0.8rem", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href="/login" style={{ color: "var(--secondary)", fontSize: "0.8rem", textDecoration: "none", padding: "6px 12px" }}>Log in</Link>
            <Link href="/signup" style={{ background: "var(--primary)", color: "var(--background)", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none", padding: "7px 14px", borderRadius: 8 }}>Sign up</Link>
          </div>
        </div>
      </nav>

      <section style={{ position: "relative", padding: "90px 24px 0" }}>
        <GlowOrb />
        <div style={{ position: "relative", maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "1.15rem", color: "var(--secondary)", lineHeight: 1.65, margin: "0 auto 32px", maxWidth: 480 }}>
            Growth OS crawls your site, finds what&apos;s costing you rankings, and ships the fix — then checks its own work.
          </p>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
            <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "var(--background)", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", padding: "10px 18px", borderRadius: 8 }}>
              Start free <ArrowRight size={14} />
            </Link>
            <Link href="#how" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.9rem", fontWeight: 500, color: "var(--secondary)", textDecoration: "none" }}>
              See how it works <ArrowRight size={13} />
            </Link>
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--muted)" }}>No credit card · Connects to Search Console in under a minute</p>
        </div>

        <div id="product" style={{ position: "relative", maxWidth: 980, margin: "56px auto 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr",
              gridTemplateAreas: `"kw ov" "sig ov" "iss cms"`,
              gap: 14,
            }}
          >
            <div style={{ gridArea: "kw" }}><KeywordStatsCard /></div>
            <div style={{ gridArea: "ov" }}><OverviewStatsCard /></div>
            <div style={{ gridArea: "sig" }}><SignalsCard /></div>
            <div style={{ gridArea: "iss" }}><IssuesCard /></div>
            <div style={{ gridArea: "cms" }}><CmsCard /></div>
          </div>
        </div>
      </section>

      <section id="how" style={{ padding: "150px 24px 60px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>How it works</p>
          <h2 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 52, maxWidth: 620 }}>Three steps, running continuously</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40 }}>
            {WORKFLOW_STEPS.map((s) => (
              <div key={s.n}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: 8, letterSpacing: "-0.01em" }}>{s.title}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--secondary)", lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {FEATURE_BLOCKS.map((block, i) => (
        <section key={block.title} style={{ padding: "80px 24px", borderTop: i === 0 ? "1px solid var(--border)" : "none" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center", direction: i % 2 === 1 ? "rtl" : "ltr" }}>
            <div style={{ direction: "ltr" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>{block.kicker}</p>
              <h3 style={{ fontSize: "clamp(1.7rem, 2.8vw, 2.2rem)", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 18, lineHeight: 1.15 }}>{block.title}</h3>
              <p style={{ fontSize: "0.95rem", color: "var(--secondary)", lineHeight: 1.7 }}>{block.desc}</p>
            </div>
            <div style={{ direction: "ltr" }}>
              <MiniMock variant={block.mock as "issues" | "keywords" | "trends"} />
            </div>
          </div>
        </section>
      ))}

      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {SMALL_CARDS.map((c) => (
              <div key={c.title} style={{ background: "var(--surface)", padding: "28px 24px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 8, letterSpacing: "-0.01em" }}>{c.title}</div>
                <div style={{ fontSize: "0.82rem", color: "var(--secondary)", lineHeight: 1.6 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "110px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 52, textAlign: "center" }}>Built for sites that can&apos;t afford to guess</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28 }}>
            {STATS.map((s) => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2.6rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--primary)", marginBottom: 8 }}>{s.v}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--secondary)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "90px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 44, textAlign: "center" }}>Pricing</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            {[
              { name: "Starter", price: 49, features: ["Website monitoring", "SEO analysis", "Keyword intelligence"] },
              { name: "Growth", price: 99, features: ["Everything in Starter", "Search Console integration", "Automations"] },
              { name: "Autopilot", price: 199, features: ["Everything in Growth", "Advanced automation", "Continuous optimization"] },
            ].map((p) => (
              <div key={p.name} style={{ background: "var(--surface)", padding: "30px 26px" }}>
                <div style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 18 }}>{p.name}</div>
                <div style={{ marginBottom: 26 }}>
                  <span style={{ fontSize: "2.3rem", fontWeight: 700, letterSpacing: "-0.03em" }}>${p.price}</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: 4 }}>/mo</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 26 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--secondary)" }}>
                      <CheckCircle2 size={12} color="var(--primary)" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/signup" style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: "0.84rem", background: "var(--elevated)", color: "var(--primary)" }}>
                  Start Free
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "130px 24px", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.035em", margin: "0 0 24px", lineHeight: 1.1 }}>
          Stop finding SEO problems.<br />Start closing them.
        </h2>
        <p style={{ fontSize: "0.92rem", color: "var(--secondary)", marginBottom: 32 }}>Free while you&apos;re under 500 tracked keywords.</p>
        <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "var(--background)", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none", padding: "11px 20px", borderRadius: 8 }}>
          Get Started Free <ArrowRight size={14} />
        </Link>
      </section>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoMark size={16} />
            <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>Growth OS</span>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>© 2026 Growth OS</span>
        </div>
      </footer>
    </div>
  );
}
