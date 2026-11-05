"use client";
import { useRef, useState } from "react";
import { uploadImage, type UploadedImage } from "./ImageInsertButton";

type Props = {
  onInsert: (markdown: string, image: UploadedImage) => void;
  onReplace?: (oldMarkdown: string, newMarkdown: string) => void;
};
type Item = UploadedImage & { name: string };

const altFromName = (n: string) => n.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

export default function ArticleImageDropzone({ onInsert, onReplace }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setErr("");
    for (const f of Array.from(files)) {
      try {
        const img = await uploadImage(f, alt.trim() || altFromName(f.name));
        onInsert(img.markdown, img);
        setItems((x) => [{ ...img, name: f.name }, ...x]);
      } catch (e) { setErr((e as Error).message); }
    }
    setAlt("");
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  function editAlt(i: number, value: string) {
    setItems((list) => list.map((it, j) => {
      if (j !== i) return it;
      const clean = value.replace(/[\[\]]/g, "");
      const markdown = `![${clean}](${it.url})`;
      onReplace?.(it.markdown, markdown);
      return { ...it, alt: clean, markdown };
    }));
  }

  return (
    <div style={{ margin: "16px 0" }}>
      <input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="Alt text for the next image (what it shows) — optional, filename is used if empty"
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #d0d5dd", borderRadius: 8, fontSize: 14, marginBottom: 8, boxSizing: "border-box" }}
      />
      <div
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${over ? "#1570ef" : "#d0d5dd"}`, background: over ? "#eff8ff" : "#fcfcfd", borderRadius: 12, padding: 24, textAlign: "center", cursor: busy ? "wait" : "pointer", fontSize: 14, color: "#475467" }}>
        {busy ? "Converting to WebP…" : "🖼 Drop images here (JPG, PNG, HEIC, GIF, AVIF, TIFF, SVG, WebP) or click — converted to WebP and inserted at the cursor"}
        <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => handle(e.target.files)} />
      </div>
      {err && <p style={{ color: "#b42318", fontSize: 13, marginTop: 8 }}>{err}</p>}
      {items.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {items.map((it, i) => (
            <li key={it.url} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eaecf0", fontSize: 13 }}>
              <img src={it.url} alt="" width={48} height={48} style={{ objectFit: "cover", borderRadius: 6 }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <input defaultValue={it.alt} onBlur={(e) => e.target.value !== it.alt && editAlt(i, e.target.value)}
                  title="Edit alt text, then click outside"
                  style={{ width: "100%", border: "1px solid #eaecf0", borderRadius: 6, padding: "4px 6px", fontSize: 13, boxSizing: "border-box" }} />
                <small style={{ color: "#667085" }}>{it.name} · {Math.round(it.bytesIn / 1024)} KB → {Math.round(it.bytesOut / 1024)} KB WebP · {it.width}×{it.height}</small>
              </span>
              <a href={it.url} download style={{ color: "#1570ef", whiteSpace: "nowrap" }}>Download .webp</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
