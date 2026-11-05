"use client";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { WriterForm } from "./writer-form";
import s from "./writer.module.css";

export function WriterButton({ websiteId, initialKeyword, label = "Write with AI", compact = false }: { websiteId: string; initialKeyword?: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open === false) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className={compact ? s.textTrigger : s.trigger} onClick={() => setOpen(true)}><Sparkles size={compact ? 12 : 14} />{label}</button>
      {open && (
        <div className={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className={s.drawer}>
            <div className={s.drawerHead}>
              <span>New article</span>
              <button className={s.close} onClick={() => setOpen(false)} aria-label="Close"><X size={15} /></button>
            </div>
            <WriterForm websiteId={websiteId} initialKeyword={initialKeyword} onSuccess={() => setTimeout(() => window.location.reload(), 2500)} />
          </div>
        </div>
      )}
    </>
  );
}
