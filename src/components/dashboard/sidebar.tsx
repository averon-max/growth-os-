"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
    <aside className={styles.sidebar} data-collapsed={collapsed ? "true" : "false"}>
      <div className={styles.brandRow}>
        <Link href={withSite("/dashboard", site)} className={styles.brand}>
          <div className={styles.brandMark}>
            <span>G</span>
          </div>
          <span className={styles.brandName}>Growth OS</span>
        </Link>

        <button
          type="button"
          onClick={toggle}
          className={styles.collapseToggle}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
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
            <strong>Growth OS</strong>
            <span>Workspace</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
