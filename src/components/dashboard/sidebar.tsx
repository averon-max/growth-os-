"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Globe, Search, Tags, Users, FileText, Swords, Target, Zap, BarChart3, Settings,
} from "lucide-react";
import styles from "./sidebar.module.css";

const items = [
  { icon: LayoutGrid, label: "Overview", href: "/dashboard" },
  { icon: Globe, label: "Websites", href: "/dashboard/websites" },
  { icon: Search, label: "SEO", href: "/dashboard/seo" },
  { icon: Tags, label: "Keywords", href: "/dashboard/keywords" },
  { icon: Users, label: "Audience", href: "/dashboard/audience" },
  { icon: FileText, label: "Content", href: "/dashboard/content" },
  { icon: Swords, label: "Competitors", href: "/dashboard/competitors" },
  { icon: Target, label: "Opportunities", href: "/dashboard/opportunities" },
  { icon: Zap, label: "Automations", href: "/dashboard/automations" },
  { icon: BarChart3, label: "Reports", href: "/dashboard/reports" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.logo}>
        <div className={styles.logoMark} />
        <span className={styles.logoText}>Growth OS</span>
      </Link>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={active ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}>
            <item.icon size={14} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
