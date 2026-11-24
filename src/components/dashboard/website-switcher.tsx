"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./topbar.module.css";

interface WebsiteOption {
  id: string;
  url: string;
  business: { name: string };
}

// Reused for a minute instead of being fetched again on every page the user opens.
const cache = new Map<string, { at: number; list: Promise<WebsiteOption[]> }>();
function loadWebsites(workspaceId: string) {
  const hit = cache.get(workspaceId);
  if (hit && Date.now() - hit.at < 60_000) return hit.list;
  const list = fetch(`/api/websites?workspaceId=${workspaceId}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (Array.isArray(data?.websites) ? (data.websites as WebsiteOption[]) : []))
    .catch(() => [] as WebsiteOption[]);
  cache.set(workspaceId, { at: Date.now(), list });
  return list;
}

const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Site selector in the top bar, in the place of Vercel's project selector. */
export function WebsiteSwitcher({ workspaceId, currentWebsiteId }: { workspaceId: string; currentWebsiteId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    loadWebsites(workspaceId).then((list) => { if (live) setWebsites(list); });
    return () => { live = false; };
  }, [workspaceId]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest(`.${styles.siteWrap}`)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const current = websites.find((w) => w.id === currentWebsiteId) ?? websites[0];
  if (!current) return null;

  return (
    <div className={styles.siteWrap}>
      <button type="button" className={styles.site} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="listbox">
        <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(current.url))}&sz=32`} alt="" width={16} height={16} className={styles.favicon} />
        <span className={styles.siteName}>{host(current.url)}</span>
        <ChevronsUpDown size={14} strokeWidth={1.6} aria-hidden />
      </button>
      {open ? (
        <div className={styles.siteMenu} role="listbox">
          {websites.map((w) => (
            <button
              key={w.id}
              type="button"
              role="option"
              aria-selected={w.id === current.id}
              className={styles.siteOption}
              onClick={() => {
                setOpen(false);
                router.push(`${pathname}?websiteId=${w.id}`);
              }}
            >
              <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(w.url))}&sz=32`} alt="" width={16} height={16} className={styles.favicon} />
              <span className={styles.siteName}>{host(w.url)}</span>
              {w.id === current.id ? <Check size={14} strokeWidth={1.8} aria-hidden /> : null}
            </button>
          ))}
          <a href="/dashboard/add-website" className={styles.siteOption}>
            <Plus size={14} strokeWidth={1.8} aria-hidden />
            <span className={styles.siteName}>Add website</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
