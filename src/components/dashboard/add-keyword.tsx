"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import s from "./add-keyword.module.css";

/*
 * A "+" that appears when you hover any keyword and adds it to the Keyword Planner of the current website.
 * Free: it only saves the keyword; numbers are fetched later, in bulk, when the planner runs.
 */

const SiteContext = createContext<string | null>(null);

export function PlannerSite({ websiteId, children }: { websiteId: string | null; children: ReactNode }) {
  return <SiteContext.Provider value={websiteId}>{children}</SiteContext.Provider>;
}

const added = new Set<string>();

export function AddKeyword({ keyword, websiteId }: { keyword: string; websiteId?: string | null }) {
  const site = useContext(SiteContext) ?? websiteId ?? null;
  const key = `${site}:${keyword.toLowerCase()}`;
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(added.has(key) ? "done" : "idle");
  if (!site || !keyword) return null;

  const add = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (state !== "idle" && state !== "error") return;
    setState("busy");
    try {
      const res = await fetch("/api/planner/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId: site, keywords: [keyword] }) });
      if (!res.ok) throw new Error();
      added.add(key);
      setState("done");
    } catch {
      setState("error");
    }
  };

  const label = state === "done" ? `“${keyword}” is in the Keyword Planner` : state === "error" ? "Could not add. Try again" : `Add “${keyword}” to the Keyword Planner`;
  return (
    <button type="button" className={s.add} data-state={state} onClick={add} title={label} aria-label={label}>
      {state === "busy" ? <Loader2 size={12} className={s.spin} /> : state === "done" ? <Check size={12} /> : <Plus size={12} />}
    </button>
  );
}
