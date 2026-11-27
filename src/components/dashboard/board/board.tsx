"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, LayoutGrid, Plus, RotateCcw, X } from "lucide-react";
import { COLS, SPEC, clampItem, resolve, type Item, type WidgetType } from "./layout";
import { WidgetBody, type BoardData } from "./widgets";
import s from "./board.module.css";

/*
 * The overview as a constructor: widgets on a 12-column grid.
 * "Customize" shows "+" in free places, a handle to move each widget and a corner to stretch it.
 * The layout is saved for the user (one small row in the database), so it looks the same on every device.
 */

const ROW = 84; // px per grid row
const GAP = 16;

type Drag = { id: string; mode: "move" | "resize"; startX: number; startY: number; orig: Item };

export function Board({ data, initial }: { data: BoardData; initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [edit, setEdit] = useState(false);
  const [picker, setPicker] = useState<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [preview, setPreviewState] = useState<Item[] | null>(null);
  const previewRef = useRef<Item[] | null>(null);
  const setPreview = (p: Item[] | null) => { previewRef.current = p; setPreviewState(p); };
  const gridRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shown = preview ?? items;
  const bottom = Math.max(...shown.map((i) => i.y + i.h), 1);
  const rows = bottom + (edit ? 2 : 0);

  const save = useCallback((next: Item[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch("/api/dashboard/layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: next }) });
    }, 500);
  }, []);
  const commit = useCallback((next: Item[]) => { setItems(next); save(next); }, [save]);

  // Pixel size of one grid cell, read from the grid itself.
  const cell = () => {
    const el = gridRef.current;
    const w = el ? el.clientWidth : 1200;
    return { cw: (w - GAP * (COLS - 1)) / COLS + GAP, rh: ROW + GAP };
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const { cw, rh } = cell();
      const dx = Math.round((e.clientX - drag.startX) / cw);
      const dy = Math.round((e.clientY - drag.startY) / rh);
      const o = drag.orig;
      const changed = drag.mode === "move" ? { ...o, x: o.x + dx, y: o.y + dy } : { ...o, w: o.w + dx, h: o.h + dy };
      setPreview(resolve(items.map((i) => (i.id === o.id ? clampItem(changed) : i)), o.id));
    };
    const onUp = () => {
      const p = previewRef.current;
      setDrag(null);
      setPreview(null);
      if (p) commit(p);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [drag, items, commit]);

  const start = (e: React.PointerEvent, it: Item, mode: Drag["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ id: it.id, mode, startX: e.clientX, startY: e.clientY, orig: it });
  };

  // Free places for "+": greedy 3×2 slots that fit between widgets.
  const slots = useMemo(() => {
    if (!edit) return [];
    const taken = (x: number, y: number) => shown.some((i) => x >= i.x && x < i.x + i.w && y >= i.y && y < i.y + i.h);
    const used = new Set<string>();
    const out: { x: number; y: number; w: number; h: number }[] = [];
    for (let y = 0; y < bottom; y++) {
      for (let x = 0; x < COLS; x++) {
        if (taken(x, y) || used.has(`${x},${y}`)) continue;
        let w = 0;
        while (x + w < COLS && w < 3 && !taken(x + w, y) && !used.has(`${x + w},${y}`)) w++;
        let h = 1;
        while (h < 2 && y + h < bottom && [...Array(w)].every((_, k) => !taken(x + k, y + h) && !used.has(`${x + k},${y + h}`))) h++;
        for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) used.add(`${x + a},${y + b}`);
        out.push({ x, y, w, h });
      }
    }
    out.push({ x: 0, y: bottom, w: COLS, h: 2 });
    return out;
  }, [edit, shown, bottom]);

  const missing = (Object.keys(SPEC) as WidgetType[]).filter((t) => !items.some((i) => i.type === t));

  const add = (type: WidgetType, at: { x: number; y: number }) => {
    const sp = SPEC[type];
    commit(resolve([...items, clampItem({ id: type, type, x: at.x, y: at.y, w: sp.w, h: sp.h })], type));
    setPicker(null);
  };
  const remove = (id: string) => commit(resolve(items.filter((i) => i.id !== id)));
  const reset = async () => {
    const res = await fetch("/api/dashboard/layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
    const json = await res.json().catch(() => null);
    if (json?.layout) setItems(json.layout);
  };

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        {edit ? (
          <>
            <span className={s.muted}>Drag a widget by its handle, stretch it from the corner, add new ones with +.</span>
            <button type="button" className={s.button} onClick={() => void reset()}><RotateCcw size={14} /> Reset</button>
            <button type="button" className={s.primary} onClick={() => { setEdit(false); setPicker(null); }}>Done</button>
          </>
        ) : (
          <button type="button" className={s.button} onClick={() => setEdit(true)}><LayoutGrid size={14} /> Customize</button>
        )}
      </div>

      <div
        ref={gridRef}
        className={s.grid}
        data-edit={edit || undefined}
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridAutoRows: ROW, gap: GAP, minHeight: rows * (ROW + GAP) - GAP }}
      >
        {shown.map((it) => (
          <section
            key={it.id}
            className={s.widget}
            data-dragging={drag?.id === it.id || undefined}
            style={{ gridColumn: `${it.x + 1} / span ${it.w}`, gridRow: `${it.y + 1} / span ${it.h}` }}
          >
            <header
              className={s.head}
              data-drag={edit || undefined}
              onPointerDown={edit ? (e) => { if (!(e.target as HTMLElement).closest("button")) start(e, it, "move"); } : undefined}
            >
              {edit ? (
                <span className={s.grip} title="Drag to move" aria-label={`Move ${SPEC[it.type].title}`}>
                  <GripVertical size={14} />
                </span>
              ) : null}
              <h2 className={s.title}>{SPEC[it.type].title}</h2>
              {edit ? (
                <button type="button" className={s.close} onClick={() => remove(it.id)} aria-label={`Remove ${SPEC[it.type].title}`}><X size={14} /></button>
              ) : null}
            </header>
            <div className={s.body}><WidgetBody type={it.type} d={data} w={it.w} /></div>
            {edit ? <span className={s.resize} onPointerDown={(e) => start(e, it, "resize")} title="Drag to resize" aria-label={`Resize ${SPEC[it.type].title}`} /> : null}
            {edit ? <i className={s.corner} data-c="tl" /> : null}
            {edit ? <i className={s.corner} data-c="tr" /> : null}
            {edit ? <i className={s.corner} data-c="bl" /> : null}
          </section>
        ))}

        {slots.map((sl) => (
          <button
            key={`${sl.x}-${sl.y}`}
            type="button"
            className={s.slot}
            style={{ gridColumn: `${sl.x + 1} / span ${sl.w}`, gridRow: `${sl.y + 1} / span ${sl.h}` }}
            onClick={() => setPicker({ x: sl.x, y: sl.y })}
            disabled={missing.length === 0}
            aria-label="Add a widget here"
          >
            <Plus size={18} />
            {sl.w === COLS ? <span className={s.slotText}>Add widget</span> : null}
          </button>
        ))}
      </div>

      {picker ? (
        <>
          <div className={s.overlay} onClick={() => setPicker(null)} />
          <div className={s.picker} role="dialog" aria-label="Add a widget">
            <div className={s.pickerHead}>Add a widget</div>
            {missing.length === 0 ? <p className={s.muted} style={{ padding: 16, margin: 0 }}>Every widget is already on the board.</p> : null}
            {missing.map((t) => (
              <button key={t} type="button" className={s.pickerItem} onClick={() => add(t, picker)}>
                <strong>{SPEC[t].title}</strong>
                <span>{SPEC[t].hint}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
