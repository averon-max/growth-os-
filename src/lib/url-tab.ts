"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * A page tab kept in the address (?tab=…), so the sidebar's sub-menu can open it and show it as active.
 * Changing the tab replaces the address without a reload and tells the sidebar ("hx:subnav").
 */
export function useUrlTab<T extends string>(param: string, allowed: readonly T[], fallback: T): [T, (t: T) => void] {
  const [tab, setTabState] = useState<T>(fallback);
  useEffect(() => {
    const read = () => {
      const v = new URLSearchParams(window.location.search).get(param) as T | null;
      setTabState(v && allowed.includes(v) ? v : fallback);
    };
    read();
    window.addEventListener("popstate", read);
    window.addEventListener("hx:subnav-go", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hx:subnav-go", read);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [param, fallback]);
  const setTab = useCallback(
    (t: T) => {
      setTabState(t);
      const url = new URL(window.location.href);
      if (t === fallback) url.searchParams.delete(param);
      else url.searchParams.set(param, t);
      window.history.replaceState(window.history.state, "", url.toString());
      window.dispatchEvent(new Event("hx:subnav"));
    },
    [param, fallback],
  );
  return [tab, setTab];
}
