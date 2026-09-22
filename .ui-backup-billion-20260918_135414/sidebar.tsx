"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Globe, Search, AlertTriangle, Tags, Users, FileText, Swords,
  Target, Zap, BarChart3, History, Settings, Plug, ChevronDown, SquarePen,
} from "lucide-react";
import styles from "./sidebar.module.css";

const groups = [
  {
    label: "Workspace",
    items: [
      { icon: LayoutGrid, label: "Overview", href: "/dashboard" },
      { icon: Globe, label: "Websites", href: "/dashboard/websites" },
    ],
  },
  {
    label: "Growth",
    items: [
      { icon: Search, label: "SEO", href: "/dashboard/seo" },
      { icon: AlertTriangle, label: "Issues", href: "/dashboard/issues" },
      { icon: Target, label: "Opportunities", href: "/dashboard/opportunities" },
      { icon: Tags, label: "Keywords", href: "/dashboard/keywords" },
      { icon: Users, label: "Audience", href: "/dashboard/audience" },
      { icon: FileText, label: "Content", href: "/dashboard/content" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { icon: Swords, label: "Competitors", href: "/dashboard/competitors" },
      { icon: Zap, label: "Automations", href: "/dashboard/automations" },
      { icon: BarChart3, label: "Reports", href: "/dashboard/reports" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: History, label: "Fix History", href: "/dashboard/fix-history" },
      { icon: Plug, label: "CMS", href: "/dashboard/cms" },
      { icon: Settings, label: "Settings", href: "/dashboard/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className={styles.sidebar}>
      <div className={styles.switcher}>
        <div className={styles.logoMark} />
        <span className={styles.switcherText}>Growth OS</span>
        <ChevronDown size={13} className={styles.chevron} />
      </div>

      <div className={styles.quickActions}>
        <button className={styles.quickAction} aria-label="Search" type="button">
          <Search size={14} />
        </button>
        <button className={styles.quickAction} aria-label="New" type="button">
          <SquarePen size={14} />
        </button>
      </div>

      {groups.map((group) => {
        const isOpen = !collapsed[group.label];
        return (
          <div key={group.label} className={styles.navGroup}>
            <button
              className={styles.navGroupHeader}
              onClick={() => setCollapsed((c) => ({ ...c, [group.label]: !c[group.label] }))}
              type="button"
            >
              <ChevronDown size={11} className={styles.navGroupChevron} data-open={isOpen} />
              <span className={styles.navGroupLabel}>{group.label}</span>
            </button>
            <div className={styles.navItems} style={{ maxHeight: isOpen ? group.items.length * 30 : 0 }}>
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
                    <item.icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
