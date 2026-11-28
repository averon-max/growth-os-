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
