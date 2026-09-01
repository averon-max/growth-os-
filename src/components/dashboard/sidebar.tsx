"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Globe, Search, AlertTriangle, Tags, Users, FileText, Swords,
  Target, Zap, BarChart3, History, Settings, Plug,
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
  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.logo}>
        <div className={styles.logoMark} />
        <span className={styles.logoText}>Growth OS</span>
      </Link>
      {groups.map((group) => (
        <div key={group.label} className={styles.navGroup}>
          <div className={styles.navGroupLabel}>{group.label}</div>
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
      ))}
    </aside>
  );
}
