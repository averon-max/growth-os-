"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
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

export function Topbar({ title, subtitle, websiteSwitcher }: Props) {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "";
  const email = session?.user?.email ?? null;
  const initial = email?.charAt(0).toUpperCase() ?? "G";

  const item = navItemFor(pathname);
  const section = item ? NAV.find((s) => s.items.some((i) => isActivePath(pathname, i) && i.href === item.href)) : undefined;
  const Icon = item?.icon;

  return (
    <div className={styles.topbar}>
      <div className={styles.titleBlock}>
        {Icon ? (
          <span className={styles.pageIcon}>
            <Icon size={15} strokeWidth={1.7} />
          </span>
        ) : null}

        {section ? (
          <>
            <span className={styles.section}>{section.label}</span>
            <span className={styles.separator}>/</span>
          </>
        ) : null}

        <span className={styles.title}>{title}</span>

        {subtitle && (
          <>
            <span className={styles.separator}>/</span>
            <span className={styles.subtitle}>{subtitle}</span>
          </>
        )}
      </div>

      <div className={styles.right}>
        {websiteSwitcher && (
          <div className={styles.websiteControl}>
            <WebsiteSwitcher
              workspaceId={websiteSwitcher.workspaceId}
              currentWebsiteId={websiteSwitcher.currentWebsiteId}
            />
          </div>
        )}

        <Link href="/dashboard/settings/account" className={styles.avatar} title={email ?? "Account"} aria-label="Account settings">
          {initial}
        </Link>
      </div>
    </div>
  );
}
