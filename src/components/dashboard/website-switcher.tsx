"use client";

import { useEffect, useState } from "react";
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

export function WebsiteSwitcher({ workspaceId, currentWebsiteId }: { workspaceId: string; currentWebsiteId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);

  useEffect(() => {
    let live = true;
    loadWebsites(workspaceId).then((list) => { if (live) setWebsites(list); });
    return () => { live = false; };
  }, [workspaceId]);

  if (websites.length <= 1) return null;

  return (
    <select
      className={styles.websiteSwitcher}
      value={currentWebsiteId}
      onChange={(e) => router.push(`${pathname}?websiteId=${e.target.value}`)}
    >
      {websites.map((w) => (
        <option key={w.id} value={w.id}>
          {w.business.name} — {w.url}
        </option>
      ))}
    </select>
  );
}
