"use client";

import { useSession } from "next-auth/react";
import { WebsiteSwitcher } from "./website-switcher";
import styles from "./topbar.module.css";

interface Props {
  title: string;
  subtitle?: string;
  websiteSwitcher?: { workspaceId: string; currentWebsiteId: string };
}

export function Topbar({ title, subtitle, websiteSwitcher }: Props) {
  const { data: session } = useSession();
  const email = session?.user?.email ?? null;

  return (
    <div className={styles.topbar}>
      <div className={styles.titleBlock}>
        <p className={styles.title}>{title}</p>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.right}>
        {websiteSwitcher && (
          <WebsiteSwitcher workspaceId={websiteSwitcher.workspaceId} currentWebsiteId={websiteSwitcher.currentWebsiteId} />
        )}
        {email && <span className={styles.userEmail}>{email}</span>}
        <div className={styles.avatar} />
      </div>
    </div>
  );
}
