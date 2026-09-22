"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  FileText,
  Globe2,
  LayoutDashboard,
  Settings,
  Sparkles,
  Tags,
  Target,
  Users,
  Workflow,
  ScanSearch,
  History,
  Plug,
} from "lucide-react";

import styles from "./sidebar.module.css";

const sections = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Websites",
        href: "/dashboard/websites",
        icon: Globe2,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "SEO",
        href: "/dashboard/seo",
        icon: ScanSearch,
      },
      {
        label: "Issues",
        href: "/dashboard/issues",
        icon: AlertTriangle,
      },
      {
        label: "Opportunities",
        href: "/dashboard/opportunities",
        icon: Target,
      },
      {
        label: "Keywords",
        href: "/dashboard/keywords",
        icon: Tags,
      },
      {
        label: "Content",
        href: "/dashboard/content",
        icon: FileText,
      },
      {
        label: "Audience",
        href: "/dashboard/audience",
        icon: Users,
      },
      {
        label: "Competitors",
        href: "/dashboard/competitors",
        icon: Sparkles,
      },
    ],
  },
  {
    label: "Operate",
    items: [
      {
        label: "CMS",
        href: "/dashboard/cms",
        icon: Plug,
      },
      {
        label: "Fix history",
        href: "/dashboard/fix-history",
        icon: History,
      },
      {
        label: "Automations",
        href: "/dashboard/automations",
        icon: Workflow,
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <span />
        </div>

        <span className={styles.brandName}>
          Growth OS
        </span>
      </div>

      <nav className={styles.navigation}>
        {sections.map((section) => (
          <div
            key={section.label}
            className={styles.section}
          >
            <div className={styles.sectionLabel}>
              {section.label}
            </div>

            <div className={styles.sectionItems}>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={styles.navItem}
                    data-active={
                      active
                        ? "true"
                        : "false"
                    }
                    aria-current={
                      active
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon
                      size={14}
                      strokeWidth={1.65}
                    />

                    <span>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <Link
          href="/dashboard/settings"
          className={styles.navItem}
          data-active={
            isActive(
              "/dashboard/settings"
            )
              ? "true"
              : "false"
          }
        >
          <Settings
            size={14}
            strokeWidth={1.65}
          />
          <span>Settings</span>
        </Link>

        <div className={styles.workspace}>
          <div className={styles.avatar}>
            G
          </div>

          <div className={styles.workspaceText}>
            <strong>Growth OS</strong>
            <span>Workspace</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
