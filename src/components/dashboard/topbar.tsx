export function Topbar({ title, site = "acme-hardware.com" }: { title: string; site?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "20px 32px", background: "#fff" }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.025em", margin: 0 }}>{title}</p>
        <p style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.35)", margin: "2px 0 0", fontFamily: "SF Mono, monospace" }}>{site}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ background: "rgba(212,160,48,0.1)", color: "#d4a030", fontSize: "0.72rem", fontFamily: "SF Mono, monospace", padding: "5px 12px", borderRadius: 100, border: "1px solid rgba(212,160,48,0.2)" }}>Score: 84</span>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.08)" }} />
      </div>
    </div>
  );
}

export function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontWeight: 700, fontSize: "1.3rem", letterSpacing: "-0.03em", margin: 0, color: positive ? "#4caf7d" : "#0a0a0a" }}>{value}</p>
      <p style={{ fontSize: "0.72rem", color: "rgba(0,0,0,0.38)", margin: "4px 0 0" }}>{label}</p>
    </div>
  );
}
