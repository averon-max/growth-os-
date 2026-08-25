export default function SettingsPage() {
  return (
    <div style={{ background: "#f2f1ed", minHeight: "100vh", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "20px 32px", background: "#fff" }}>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", margin: 0 }}>Settings</p>
      </div>
      <div style={{ padding: "32px" }}>
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", padding: 32, maxWidth: 480 }}>
          <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 20 }}>Connected data sources</p>
          {["Google Search Console", "Google Analytics", "Google Business Profile"].map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: "0.85rem" }}>{s}</span>
              <span style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.3)" }}>Not connected</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
