"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin.module.css";

export default function AdminToggle({
  userId,
  isAdmin,
  self,
}: {
  userId: string;
  isAdmin: boolean;
  self: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch("/api/admin/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isAdmin: !isAdmin }),
    });
    setBusy(false);
    router.refresh();
  }

  if (self) {
    return <span className={styles.self}>you</span>;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={isAdmin ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
    >
      {isAdmin ? "admin — remove" : "make admin"}
    </button>
  );
}
