"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./topbar.module.css";

interface WebsiteOption {
  id: string;
  url: string;
  business: { name: string };
}

export function WebsiteSwitcher({ workspaceId, currentWebsiteId }: { workspaceId: string; currentWebsiteId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);

  useEffect(() => {
    fetch(`/api/websites?workspaceId=${workspaceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.websites) setWebsites(data.websites);
      });
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
