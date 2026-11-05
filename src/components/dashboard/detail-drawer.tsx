"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import s from "./detail-drawer.module.css";

export interface DrawerItem { primary: string; secondary?: string; href?: string }
export interface DrawerData {
  title: string; subtitle?: string; fields?: [string, ReactNode][];
  itemsTitle?: string; items?: DrawerItem[];
  extraTitle?: string; extra?: DrawerItem[]; extraLoading?: boolean;
  serpFor?: { keyword: string; volume: number };
  actions?: ReactNode;
}

function List({ title, items }: { title: string; items: DrawerItem[] }) {
  return (
    <>
      <div className={s.label}>{title}</div>
      {items.length === 0 ? <div className={s.secondary}>Nothing here.</div> : items.map((it, i) =>
        it.href ? (
          <a key={i} className={s.item} href={it.href} target="_blank" rel="noreferrer"><span className={s.primary}>{it.primary}</span>{it.secondary ? <span className={s.secondary}>{it.secondary}</span> : null}</a>
        ) : (
          <div key={i} className={s.item}><span className={s.primary}>{it.primary}</span>{it.secondary ? <span className={s.secondary}>{it.secondary}</span> : null}</div>
        ))}
    </>
  );
}

/** Linear-style peek panel: opens on row click, closes on Esc or backdrop click. */
export function DetailDrawer({ data, onClose }: { data: DrawerData; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <aside className={s.panel} role="dialog" aria-label={data.title}>
        <div className={s.head}>
          <div style={{ minWidth: 0 }}>
            <h2 className={s.title}>{data.title}</h2>
            {data.subtitle ? <div className={s.sub}>{data.subtitle}</div> : null}
          </div>
          <button className={s.close} onClick={onClose} aria-label="Close"><X size={14} /></button>
        </div>
        <div className={s.body}>
          {data.fields && data.fields.length > 0 ? (
            <>
              <div className={s.label}>Properties</div>
              {data.fields.map(([k, v]) => <div key={k} className={s.field}><span>{k}</span><span>{v}</span></div>)}
            </>
          ) : null}
          {data.extraLoading ? <><div className={s.label}>{data.extraTitle ?? "Loading"}</div><div className={s.secondary}>Loading…</div></> : data.extra ? <List title={data.extraTitle ?? "More"} items={data.extra} /> : null}
          {data.items ? <List title={data.itemsTitle ?? "Items"} items={data.items} /> : null}
        </div>
        {data.actions ? <div className={s.actions}>{data.actions}</div> : null}
      </aside>
    </>
  );
}
