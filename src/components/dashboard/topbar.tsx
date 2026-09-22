"use client";

import { useSession } from "next-auth/react";
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
  const email = session?.user?.email ?? null;
  const initial = email?.charAt(0).toUpperCase() ?? "G";

  return (
    <div className={styles.topbar}>
      <div className={styles.titleBlock}>
        <span className={styles.contextDot} />
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

        <div className={styles.avatar} aria-label={email ?? "Account"}>
          {initial}
        </div>
      </div>
    </div>
  );
}
