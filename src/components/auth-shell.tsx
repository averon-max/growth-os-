import Link from "next/link";
import { Inter, Newsreader } from "next/font/google";
import styles from "./auth.module.css";

const sans = Inter({ subsets: ["latin"], variable: "--auth-sans", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--auth-serif", display: "swap" });

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className={`${styles.page} ${sans.variable} ${serif.variable}`}>
      <Link href="/" className={styles.brand} aria-label="Hyprlyx home">
        <span className={styles.mark}>
          <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 19L12 5l6 14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.6 13.6h6.8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </span>
        Hyprlyx
      </Link>

      <section className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {children}
      </section>

      {footer ? <p className={styles.footer}>{footer}</p> : null}
    </main>
  );
}

export { styles as authStyles };
