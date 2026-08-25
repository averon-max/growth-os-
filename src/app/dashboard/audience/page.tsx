export default function AudiencePage() {
  return (
    <div style={{ background: "#f2f1ed", minHeight: "100vh", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "20px 32px", background: "#fff" }}>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>Audience</p>
        <p style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.35)", margin: "2px 0 0" }}>Coming soon — requires analytics integration</p>
      </div>
      <div style={{ padding: "60px 32px", textAlign: "center" }}>
        <p style={{ color: "rgba(0,0,0,0.35)", fontSize: "0.88rem" }}>Audience data requires Google Analytics integration.</p>
      </div>
    </div>
  );
}
