"use client";
import { useState } from "react";
import { uploadImage, type UploadedImage } from "@/components/editor/ImageInsertButton";

export default function WebpConverterPage() {
  const [items, setItems] = useState<(UploadedImage & { name: string })[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function convert(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    for (const f of Array.from(files)) {
      try { const r = await uploadImage(f, ""); setItems((x) => [{ ...r, name: f.name }, ...x]); }
      catch (e) { setErr(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>WebP converter</h1>
      <p style={{ color: "#667085", marginBottom: 16 }}>JPG, PNG, GIF, AVIF or TIFF → WebP, resized to max 1600 px, metadata removed.</p>
      <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); convert(e.dataTransfer.files); }}
        style={{ display: "block", border: "2px dashed #d0d5dd", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer" }}>
        {busy ? "Converting…" : "Drop images here or click to choose"}
        <input type="file" accept="image/*" multiple hidden onChange={(e) => convert(e.target.files)} />
      </label>
      {err && <p style={{ color: "#b42318", marginTop: 12 }}>{err}</p>}
      <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
        {items.map((it) => (
          <li key={it.url} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #eaecf0" }}>
            <img src={it.url} alt="" width={64} height={64} style={{ objectFit: "cover", borderRadius: 6 }} />
            <span style={{ flex: 1 }}>{it.name}<br /><small style={{ color: "#667085" }}>{Math.round(it.bytesIn / 1024)} KB → {Math.round(it.bytesOut / 1024)} KB · {it.width}×{it.height}</small></span>
            <a href={it.url} download style={{ fontSize: 14 }}>Download .webp</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
