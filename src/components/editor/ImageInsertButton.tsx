"use client";
import { useRef, useState } from "react";

export type UploadedImage = { url: string; alt: string; width: number; height: number; bytesIn: number; bytesOut: number; markdown: string };

export async function uploadImage(file: File, alt: string): Promise<UploadedImage> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("alt", alt);
  const r = await fetch("/api/images", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Upload failed");
  return j;
}

/** Inserts text at the cursor of a textarea and returns the new value. */
export function insertAtCursor(el: HTMLTextAreaElement, text: string): string {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const block = `\n\n${text}\n\n`;
  const value = el.value.slice(0, start) + block + el.value.slice(end);
  requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = start + block.length; });
  return value;
}

type Props = { onInsert: (markdown: string, image: UploadedImage) => void; label?: string };

export default function ImageInsertButton({ onInsert, label = "Insert image" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMsg("");
    try {
      for (const f of Array.from(files)) {
        const suggested = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        const alt = suggested;
        const img = await uploadImage(f, alt);
        onInsert(img.markdown, img);
        setMsg(`${f.name}: ${Math.round(img.bytesIn / 1024)} KB → ${Math.round(img.bytesOut / 1024)} KB WebP`);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d0d5dd", background: "#fff", cursor: busy ? "wait" : "pointer", fontSize: 14 }}>
        {busy ? "Converting…" : `🖼 ${label}`}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => handle(e.target.files)} />
      {msg && <small style={{ color: "#667085" }}>{msg}</small>}
    </span>
  );
}
