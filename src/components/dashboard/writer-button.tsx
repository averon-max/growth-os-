"use client";
import { useState } from "react";
import { WriterForm } from "./writer-form";

export function WriterButton({ websiteId }: { websiteId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#7c3aed", color: "#fff", border: "none",
          borderRadius: 8, padding: "8px 18px", fontSize: 14,
          fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        ✦ Write with AI
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
            zIndex: 100, display: "flex", justifyContent: "flex-end",
          }}
        >
          <div style={{
            width: 420, height: "100%", background: "#0a0c10",
            borderLeft: "1px solid #1e2330", overflowY: "auto",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #1e2330" }}>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>New Article</span>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            <WriterForm websiteId={websiteId} onSuccess={() => setTimeout(() => window.location.reload(), 1500)} />
          </div>
        </div>
      )}
    </>
  );
}
