"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowUp } from "lucide-react";

import { FOOTER_EXTRA, NAV, isActivePath, withSite, type NavSection } from "@/lib/nav";

import styles from "./app-footer.module.css";

function scrollToTop() {
  const root = document.querySelector(".page-shell")?.parentElement;
  root?.scrollTo({ top: 0, behavior: "smooth" });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function AppFooter() {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const site = params?.get("websiteId") ?? null;

  const columns: NavSection[] = [...NAV, ...FOOTER_EXTRA]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.footer !== false),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href={withSite("/dashboard", site)} className={styles.brandRow}>
              <span className={styles.mark}>G</span>
              Growth OS
            </Link>
            <p className={styles.tagline}>
              Keywords, content, backlinks and traffic for your sites — in one workspace.
            </p>
          </div>

          {columns.map((section) => (
            <nav key={section.label} className={styles.col} aria-label={section.label}>
              <h4 className={styles.colTitle}>{section.label}</h4>
              <ul className={styles.list}>
                {section.items.map((item) => {
                  const active = isActivePath(pathname, item);
                  const href = item.keepSite === false ? item.href : withSite(item.href, site);
                  return (
                    <li key={`${section.label}-${item.href}`}>
                      <Link
                        href={href}
                        className={styles.link}
                        data-active={active ? "true" : "false"}
                        aria-current={active ? "page" : undefined}
                        title={item.description}
                      >
                        {item.label}
                        {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} Growth OS</span>
          <button type="button" className={styles.toTop} onClick={scrollToTop}>
            <ArrowUp size={13} strokeWidth={1.8} />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
