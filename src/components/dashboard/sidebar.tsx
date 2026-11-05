"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Compass, FileText, Globe2, LayoutDashboard, Link2, Plug, ScanSearch, Settings, Sparkles, Tags, Users } from "lucide-react";
import styles from "./sidebar.module.css";

const sections = [
  { label: "Workspace", items: [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: "Websites", href: "/dashboard/websites", icon: Globe2 },
  ] },
  { label: "Search", items: [
    { label: "Keywords", href: "/dashboard/keywords", icon: Tags },
    { label: "Keyword Planner", href: "/dashboard/keyword-planner", icon: Compass },
    { label: "Content", href: "/dashboard/content", icon: FileText },
    { label: "Backlinks", href: "/dashboard/backlinks", icon: Link2 },
    { label: "Competitors", href: "/dashboard/competitors", icon: Sparkles },
  ] },
  { label: "Traffic", items: [
    { label: "Audience", href: "/dashboard/audience", icon: Users },
    { label: "Bots & crawlers", href: "/dashboard/bots", icon: Bot },
  ] },
  { label: "Site", items: [
    { label: "SEO audit", href: "/dashboard/seo", icon: ScanSearch },
    { label: "CMS", href: "/dashboard/cms", icon: Plug },
  ] },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}><span /></div>
        <span className={styles.brandName}>Growth OS</span>
      </div>
      <nav className={styles.navigation}>
        {sections.map((section) => (
          <div key={section.label} className={styles.section}>
            <div className={styles.sectionLabel}>{section.label}</div>
            <div className={styles.sectionItems}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} className={styles.navItem} data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}>
                    <Icon size={17} strokeWidth={1.65} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className={styles.footer}>
        <Link href="/dashboard/settings" className={styles.navItem} data-active={isActive("/dashboard/settings") ? "true" : "false"}>
          <Settings size={17} strokeWidth={1.65} />
          <span>Settings</span>
        </Link>
        <div className={styles.workspace}>
          <div className={styles.avatar}>G</div>
          <div className={styles.workspaceText}><strong>Growth OS</strong><span>Workspace</span></div>
        </div>
      </div>
    </aside>
  );
}
