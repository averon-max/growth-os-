import type { CSSProperties } from "react";

/*
 * One look for every settings page (General, Account, Billing, Data): the same card, header, rows,
 * fields and buttons, so the tabs read as one product. Change a value here, not in a panel.
 */
export const card: CSSProperties = { overflow: "hidden", marginTop: 16, border: "1px solid #1f1f1f", borderRadius: 12, background: "#0a0a0a" };
export const head: CSSProperties = { padding: "16px 20px", borderBottom: "1px solid #1a1a1a", color: "#ededed", fontSize: 14, fontWeight: 500 };
export const row: CSSProperties = { display: "flex", alignItems: "center", gap: 20, padding: "14px 20px", borderTop: "1px solid #141414" };
export const rowTitle: CSSProperties = { color: "#ededed", fontSize: 14, fontWeight: 500 };
export const rowHelp: CSSProperties = { marginTop: 4, color: "#8f8f8f", fontSize: 13, lineHeight: 1.5 };
export const label: CSSProperties = { display: "block", marginBottom: 6, color: "#a1a1a1", fontSize: 13 };
export const input: CSSProperties = { width: "100%", maxWidth: 380, height: 36, padding: "0 12px", border: "1px solid #2e2e2e", borderRadius: 6, background: "#000", color: "#ededed", fontSize: 14, outline: "none" };
export const select: CSSProperties = { minWidth: 140, height: 32, padding: "0 10px", border: "1px solid #2e2e2e", borderRadius: 6, background: "#000", color: "#ededed", fontSize: 13.5 };
export const btn: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", height: 32, padding: "0 14px", border: 0, borderRadius: 6, background: "#ededed", color: "#0a0a0a", fontSize: 13, fontWeight: 500, textDecoration: "none", cursor: "pointer" };
export const ghost: CSSProperties = { ...btn, border: "1px solid #2e2e2e", background: "transparent", color: "#ededed" };
export const danger: CSSProperties = { ...btn, border: "1px solid rgba(229,72,77,.35)", background: "rgba(229,72,77,.06)", color: "#ff6369" };
export const note: CSSProperties = { margin: 0, color: "#8f8f8f", fontSize: 13, lineHeight: 1.55 };
export const sectionTitle: CSSProperties = { margin: 0, color: "#ededed", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" };
