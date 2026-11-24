"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

import { NAV, isActivePath, navItemFor } from "@/lib/nav";

import { WebsiteSwitcher } from "./website-switcher";
import styles from "./topbar.module.css";

interface Props {
  title: string;
  subtitle?: string;
  websiteSwitcher?: {
    workspaceId: string;
    currentWebsiteId: string;
  };
}

/** Top bar: site selector on the left (Vercel's project selector), the page in the middle, one real action on the right. */
export function Topbar({ title, subtitle, websiteSwitcher }: Props) {
  const pathname = usePathname() ?? "";
  const item = navItemFor(pathname);
  const section = item ? NAV.find((s) => s.items.some((i) => isActivePath(pathname, i) && i.href === item.href)) : undefined;

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {websiteSwitcher ? (
          <WebsiteSwitcher workspaceId={websiteSwitcher.workspaceId} currentWebsiteId={websiteSwitcher.currentWebsiteId} />
        ) : section ? (
          <span className={styles.section}>{section.label}</span>
        ) : null}
      </div>

      <div className={styles.center}>
        <span className={styles.title}>{title}</span>
        {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
      </div>

      <div className={styles.right}>
        <Link href="/dashboard/add-website" className={styles.action}>
          <Plus size={16} strokeWidth={1.6} aria-hidden />
          <span>Add website</span>
        </Link>
      </div>
    </header>
  );
}
