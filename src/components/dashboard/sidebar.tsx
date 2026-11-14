"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeft, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { NAV, NAV_ADMIN, NAV_BOTTOM, isActivePath, withSite, type NavItem } from "@/lib/nav";

import styles from "./sidebar.module.css";

export { withSite } from "@/lib/nav";

function NavLink({ item, pathname, site }: { item: NavItem; pathname: string; site: string | null }) {
  const Icon = item.icon;
  const active = isActivePath(pathname, item);
  const href = item.keepSite === false ? item.href : withSite(item.href, site);

  return (
    <Link
      href={href}
      className={styles.navItem}
      data-active={active ? "true" : "false"}
      aria-current={active ? "page" : undefined}
      title={item.description}
    >
      <Icon size={16} strokeWidth={1.7} />
      <span className={styles.navLabel}>{item.label}</span>
      {item.badge ? <span className={styles.navBadge}>{item.badge}</span> : null}
    </Link>
  );
}

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const site = params?.get("websiteId") ?? null;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer on navigation and on Esc.
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Состояние живёт между переходами и перезагрузками.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <>
    <button type="button" className={styles.mobileMenu} onClick={() => setMobileOpen(true)} aria-label="Open menu" aria-expanded={mobileOpen}>
      <PanelLeft size={18} strokeWidth={1.8} />
    </button>
    {mobileOpen ? <div className={styles.backdrop} onClick={() => setMobileOpen(false)} aria-hidden="true" /> : null}
    <aside className={styles.sidebar} data-collapsed={collapsed ? "true" : "false"} data-mobile-open={mobileOpen ? "true" : "false"}>
      <button type="button" className={styles.mobileClose} onClick={() => setMobileOpen(false)} aria-label="Close menu">
        <X size={18} strokeWidth={1.8} />
      </button>
      <div className={styles.brandRow}>
        <Link href={withSite("/dashboard", site)} className={styles.brand}>
          <div className={styles.brandMark}>
            <span>G</span>
          </div>
          <span className={styles.brandName}>Hyprlyx</span>
        </Link>

        <button
          type="button"
          onClick={toggle}
          className={styles.collapseToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.7} /> : <PanelLeftClose size={16} strokeWidth={1.7} />}
        </button>
      </div>

      <nav className={styles.navigation} aria-label="Main">
        {NAV.map((section) => {
          const items = section.items.filter((item) => item.sidebar !== false);
          if (items.length === 0) return null;

          return (
            <div key={section.label} className={styles.section}>
              <div className={styles.sectionLabel}>{section.label}</div>
              <div className={styles.sectionItems}>
                {items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} site={site} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={styles.footer}>
        {isAdmin ? <NavLink item={NAV_ADMIN} pathname={pathname} site={site} /> : null}

        {NAV_BOTTOM.filter((item) => item.sidebar !== false).map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} site={site} />
        ))}

        <div className={styles.workspace}>
          <div className={styles.avatar}>G</div>
          <div className={styles.workspaceText}>
            <strong>Hyprlyx</strong>
            <span>Workspace</span>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
