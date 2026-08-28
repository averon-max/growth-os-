"use client";

import { useSession } from "next-auth/react";
import styles from "./topbar.module.css";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { data: session } = useSession();
  const email = session?.user?.email ?? null;

  return (
    <div className={styles.topbar}>
      <div className={styles.titleBlock}>
        <p className={styles.title}>{title}</p>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.right}>
        {email && <span className={styles.userEmail}>{email}</span>}
        <div className={styles.avatar} />
      </div>
    </div>
  );
}
