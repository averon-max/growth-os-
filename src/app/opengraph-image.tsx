import { ImageResponse } from "next/og";

export const alt = "Hyprlyx — the SEO workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#08090a", color: "#f7f8f8" }}>
        <div style={{ fontSize: 34, letterSpacing: -1, fontFamily: "serif" }}>Hyprlyx</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: -2, fontFamily: "serif", maxWidth: 950 }}>Plan, write and rank in one SEO workspace</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#8a8f98" }}>Keyword research · Rank tracking · Site audit · Backlinks · Competitors</div>
        </div>
        <div style={{ fontSize: 24, color: "#62666d" }}>hyprlyx.com</div>
      </div>
    ),
    size,
  );
}
