"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ui.module.css";

interface Props {
  websiteId: string;
  currentSiteUrl: string;
}

type CMSType = "CUSTOM_API" | "WORDPRESS";

export function CMSConnectForm({ websiteId, currentSiteUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmsType, setCmsType] = useState<CMSType>("CUSTOM_API");
  const [form, setForm] = useState({ siteUrl: currentSiteUrl, username: "", password: "" });

  const isWordPress = cmsType === "WORDPRESS";

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          cmsType,
          siteUrl: form.siteUrl,
          username: isWordPress ? form.username : undefined,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (!data.verified) {
        setError(data.connection?.lastError || "Credentials could not be verified.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Connection type *</label>
        <select
          className={styles.formInput}
          value={cmsType}
          onChange={(e) => setCmsType(e.target.value as CMSType)}
        >
          <option value="CUSTOM_API">Custom website (Growth OS Integration API)</option>
          <option value="WORDPRESS">WordPress</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{isWordPress ? "WordPress site URL *" : "Website API base URL *"}</label>
        <input
          className={styles.formInput}
          type="text"
          placeholder="https://example.com"
          value={form.siteUrl}
          onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
        />
      </div>

      {isWordPress && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Username *</label>
          <input
            className={styles.formInput}
            type="text"
            placeholder="admin"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>{isWordPress ? "Application password *" : "API key *"}</label>
        <input
          className={styles.formInput}
          type="password"
          placeholder={isWordPress ? "xxxx xxxx xxxx xxxx xxxx xxxx" : "sk_live_..."}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      <button
        className={styles.primaryButton}
        onClick={handleSubmit}
        disabled={loading || !form.siteUrl || !form.password || (isWordPress && !form.username)}
      >
        {loading ? "Verifying..." : "Connect →"}
      </button>
    </div>
  );
}
