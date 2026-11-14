import Link from "next/link";
import { SiteShell } from "@/components/site/site-shell";
import styles from "./legal.module.css";

export const LEGAL = {
  company: "Hyprlyx",            // replace with your legal entity name once registered, e.g. "Hyprlyx Inc."
  site: "hyprlyx.com",
  email: "privacy@hyprlyx.com",
  supportEmail: "support@hyprlyx.com",
  jurisdiction: "the Province of Alberta, Canada",
  effective: "November 10, 2026",
};

export function LegalShell({ title, current, children }: { title: string; current: "privacy" | "terms" | "cookies"; children: React.ReactNode }) {
  const link = (href: string, key: string, label: string) => (
    <Link href={href} aria-current={current === key ? "page" : undefined}>{label}</Link>
  );
  return (
    <SiteShell>
      <article className={styles.doc} style={{ ["--legal-serif" as string]: "var(--font-landing-display)" }}>
        <div className={styles.links} style={{ marginBottom: 28 }}>
          {link("/terms", "terms", "Terms")}
          {link("/privacy", "privacy", "Privacy")}
          {link("/cookies", "cookies", "Cookies")}
        </div>
        <h1>{title}</h1>
        <div className={styles.meta}>Effective {LEGAL.effective} · Last updated {LEGAL.effective}</div>
        {children}
      </article>
    </SiteShell>
  );
}

export { styles as legalStyles };
