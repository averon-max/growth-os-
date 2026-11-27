"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LayoutGrid, Plus, RotateCcw, X } from "lucide-react";
import { COLS, SPEC, clampItem, firstFit, resolve, toStored, type Item, type WidgetType } from "./layout";
import { WidgetBody, type BoardData } from "./widgets";
import s from "./board.module.css";

/*
 * The overview as a constructor. In "Customize":
 *   - drag a widget by its header; it follows the pointer and the others slide out of its way;
 *   - stretch it from any edge or corner;
 *   - "Add widget" puts a new one in the first free place.
 * Widgets are placed in pixels from a 24-column grid, so every move is animated instead of jumping.
 * The layout is saved for the user, so it looks the same on every device.
 */

const ROW = 34;
const GAP = 16;
const RH = ROW + GAP;
const MOBILE = 760;

type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type Drag = { id: string; mode: "move" | Edge; startX: number; startY: number; orig: Item; dx: number; dy: number };
type Rect = { left: number; top: number; width: number; height: number };

const EDGES: Edge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/** Widget contents re-render only when their own inputs change, not on every pointer move of a drag. */
const Body = memo(function Body({ type, d, w }: { type: WidgetType; d: BoardData; w: number }) {
  return <WidgetBody type={type} d={d} w={w} />;
});

export function Board({ data, initial }: { data: BoardData; initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);
  const [edit, setEdit] = useState(false);
  const [picker, setPicker] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [width, setWidth] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cw = (Math.max(width, 320) + GAP) / COLS;
  const rectOf = (it: Item): Rect => ({ left: it.x * cw, top: it.y * RH, width: it.w * cw - GAP, height: it.h * RH - GAP });
  // Resting places use percentages of the board width, so the first paint (before measuring) is already right.
  // Before the board is measured: percentages (right on first paint). After: a GPU transform, so moves glide.
  const place = (it: Item): React.CSSProperties =>
    width > 0
      ? { left: 0, top: 0, width: it.w * cw - GAP, height: it.h * RH - GAP, transform: `translate3d(${it.x * cw}px, ${it.y * RH}px, 0)` }
      : { left: `calc((100% + ${GAP}px) * ${it.x / COLS})`, width: `calc((100% + ${GAP}px) * ${it.w / COLS} - ${GAP}px)`, top: it.y * RH, height: it.h * RH - GAP };
  const placeLive = (r: Rect): React.CSSProperties => ({ left: 0, top: 0, width: r.width, height: r.height, transform: `translate3d(${r.left}px, ${r.top}px, 0) scale(1.015)` });
  const [dropped, setDropped] = useState<string | null>(null);
  // Animations switch on only after the first measured paint, so widgets don't fly in on load.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (width === 0 || settled) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSettled(true)));
    return () => cancelAnimationFrame(id);
  }, [width, settled]);

  /** The live pixel box of the widget being dragged, and the grid place it would drop into. */
  const live = (d: Drag): { rect: Rect; target: Item } => {
    const o = rectOf(d.orig);
    const sp = SPEC[d.orig.type];
    const minW = sp.minW * cw - GAP;
    const minH = sp.minH * RH - GAP;
    let { left, top, width: w, height: h } = o;
    if (d.mode === "move") {
      left += d.dx;
      top += d.dy;
    } else {
      if (d.mode.includes("e")) w = Math.max(minW, o.width + d.dx);
      if (d.mode.includes("s")) h = Math.max(minH, o.height + d.dy);
      if (d.mode.includes("w")) { w = Math.max(minW, o.width - d.dx); left = o.left + o.width - w; }
      if (d.mode.includes("n")) { h = Math.max(minH, o.height - d.dy); top = o.top + o.height - h; }
    }
    left = Math.max(0, Math.min(left, COLS * cw - GAP - w));
    top = Math.max(0, top);
    w = Math.min(w, COLS * cw - GAP);
    let target = clampItem({ ...d.orig, x: left / cw, y: top / RH, w: (w + GAP) / cw, h: (h + GAP) / RH });
    // Stretching from the left or top keeps the opposite edge where it was.
    if (d.mode !== "move" && d.mode.includes("w")) target = { ...target, x: Math.max(0, d.orig.x + d.orig.w - target.w) };
    if (d.mode !== "move" && d.mode.includes("n")) target = { ...target, y: Math.max(0, d.orig.y + d.orig.h - target.h) };
    return { rect: { left, top, width: w, height: h }, target };
  };

  // Hysteresis: the drop place changes only once the pointer is well into the next cell, so neighbours don't flicker.
  const lastTarget = useRef<Item | null>(null);
  const rawCurrent = drag ? live(drag) : null;
  let held = rawCurrent;
  if (rawCurrent && drag) {
    const prev = lastTarget.current && lastTarget.current.id === drag.id ? lastTarget.current : null;
    const t = rawCurrent.target;
    const rx = rawCurrent.rect.left / cw, ry = rawCurrent.rect.top / RH;
    const rw = (rawCurrent.rect.width + GAP) / cw, rh = (rawCurrent.rect.height + GAP) / RH;
    const near = prev && Math.abs(rx - prev.x) < 0.7 && Math.abs(ry - prev.y) < 0.7 && Math.abs(rw - prev.w) < 0.7 && Math.abs(rh - prev.h) < 0.7;
    const target = near && prev ? prev : t;
    lastTarget.current = target;
    held = { rect: rawCurrent.rect, target };
  } else {
    lastTarget.current = null;
  }
  const current = held;
  const shown = current && drag ? resolve(items.map((i) => (i.id === drag.id ? current.target : i)), drag.id) : items;

  const save = useCallback((next: Item[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch("/api/dashboard/layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: toStored(next) }) });
    }, 400);
  }, []);
  const commit = useCallback((next: Item[]) => { setItems(next); save(next); }, [save]);

  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const shownRef = useRef<Item[]>(shown);
  shownRef.current = shown;

  useEffect(() => {
    if (!drag) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setDrag((d) => (d ? { ...d, dx: e.clientX - d.startX, dy: e.clientY - d.startY } : d)));
    };
    const onUp = () => {
      cancelAnimationFrame(frame);
      const d = dragRef.current;
      if (d) {
        commit(resolve(shownRef.current, d.id, false));
        setDropped(d.id);
        setTimeout(() => setDropped(null), 450);
      }
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // Listeners are set once per drag; the latest state is read through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, commit]);

  const start = (e: React.PointerEvent, it: Item, mode: Drag["mode"]) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDrag({ id: it.id, mode, startX: e.clientX, startY: e.clientY, orig: it, dx: 0, dy: 0 });
  };

  const missing = (Object.keys(SPEC) as WidgetType[]).filter((t) => !items.some((i) => i.type === t));
  const add = (type: WidgetType) => {
    commit(resolve([...items, firstFit(items, type)], undefined, false));
    setPicker(false);
  };
  const remove = (id: string) => commit(resolve(items.filter((i) => i.id !== id), undefined, false));
  const reset = async () => {
    const res = await fetch("/api/dashboard/layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reset: true }) });
    const json = await res.json().catch(() => null);
    if (json?.layout) setItems(json.layout);
  };

  const mobile = width > 0 && width < MOBILE;
  const bottom = Math.max(1, ...shown.map((i) => i.y + i.h));
  const liveBottom = current ? (current.rect.top + current.rect.height + GAP) / RH : 0;
  const rows = Math.max(bottom, Math.ceil(liveBottom)) + (edit ? 3 : 0);

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        {edit ? (
          <>
            <span className={s.muted}>Drag by the title, stretch from any edge.</span>
            <button type="button" className={s.button} onClick={() => setPicker(true)} disabled={missing.length === 0}><Plus size={14} /> Add widget</button>
            <button type="button" className={s.button} onClick={() => void reset()}><RotateCcw size={14} /> Reset</button>
            <button type="button" className={s.primary} onClick={() => { setEdit(false); setPicker(false); }}>Done</button>
          </>
        ) : (
          <button type="button" className={s.button} onClick={() => setEdit(true)}><LayoutGrid size={14} /> Customize</button>
        )}
      </div>

      <div
        ref={gridRef}
        className={s.grid}
        data-edit={edit || undefined}
        data-mobile={mobile || undefined}
        data-dragging={drag ? true : undefined}
        style={mobile ? undefined : { height: rows * RH - GAP }}
      >
        {current && drag ? <div className={s.ghost} style={place(current.target)} /> : null}

        {(mobile ? [...shown].sort((a, b) => a.y - b.y || a.x - b.x) : shown).map((it) => {
          const active = drag?.id === it.id && current;
          const r = active && current ? placeLive(current.rect) : place(it);
          return (
            <section
              key={it.id}
              className={s.widget}
              data-active={active ? true : undefined}
              data-dropped={dropped === it.id || undefined}
              data-ready={settled || undefined}
              style={mobile ? { minHeight: Math.max(240, it.h * RH * 0.7) } : r}
            >
              <header
                className={s.head}
                data-drag={edit && !mobile ? true : undefined}
                onPointerDown={edit && !mobile ? (e) => { if (!(e.target as HTMLElement).closest("button")) start(e, it, "move"); } : undefined}
              >
                <h2 className={s.title}>{SPEC[it.type].title}</h2>
                {edit ? (
                  <button type="button" className={s.close} onClick={() => remove(it.id)} aria-label={`Remove ${SPEC[it.type].title}`}><X size={14} /></button>
                ) : null}
              </header>
              {/* While stretching, the contents keep their size (no chart redraw on every frame) and settle on drop. */}
              <div className={s.body} style={active && drag && drag.mode !== "move" ? { flex: "none", width: rectOf(drag.orig).width, height: rectOf(drag.orig).height - 44 } : undefined}>
                <Body type={it.type} d={data} w={Math.round(it.w / 2)} />
              </div>
              {edit && !mobile
                ? EDGES.map((edge) => (
                    <span key={edge} className={s.handle} data-edge={edge} onPointerDown={(e) => start(e, it, edge)} aria-hidden />
                  ))
                : null}
            </section>
          );
        })}

        {edit && !mobile ? (
          <button
            type="button"
            className={s.addRow}
            style={{ left: 0, right: 0, top: bottom * RH, height: 2 * RH - GAP }}
            onClick={() => setPicker(true)}
            disabled={missing.length === 0}
          >
            <Plus size={16} /> {missing.length === 0 ? "Every widget is on the board" : "Add widget"}
          </button>
        ) : null}
      </div>

      {picker ? (
        <>
          <div className={s.overlay} onClick={() => setPicker(false)} />
          <div className={s.picker} role="dialog" aria-label="Add a widget">
            <div className={s.pickerHead}>Add a widget</div>
            {missing.map((t) => (
              <button key={t} type="button" className={s.pickerItem} onClick={() => add(t)}>
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
