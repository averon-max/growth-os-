import Link from "next/link";
import { Newsreader } from "next/font/google";
import styles from "./legal.module.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--legal-serif", display: "swap" });

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
    <main className={`${styles.page} ${serif.variable}`}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>Hyprlyx</Link>
        <div className={styles.links}>
          {link("/terms", "terms", "Terms")}
          {link("/privacy", "privacy", "Privacy")}
          {link("/cookies", "cookies", "Cookies")}
        </div>
      </nav>
      <article className={styles.doc}>
        <h1>{title}</h1>
        <div className={styles.meta}>Effective {LEGAL.effective} · Last updated {LEGAL.effective}</div>
        {children}
      </article>
    </main>
  );
}

export { styles as legalStyles };
