"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, Tags, Users, FileText, Swords, Target, Zap, BarChart3, Settings } from "lucide-react";

const items = [
  { icon: LayoutGrid, label: "Overview", href: "/dashboard" },
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
    <aside style={{ width: 220, borderRight: "1px solid rgba(0,0,0,0.08)", background: "#fff", padding: "24px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", marginBottom: 20, textDecoration: "none" }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#d4a030" }} />
        </div>
        <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0a0a0a", letterSpacing: "-0.02em" }}>SIGNAL</span>
      </Link>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, textDecoration: "none", fontSize: "0.82rem", fontWeight: active ? 600 : 400, color: active ? "#0a0a0a" : "rgba(0,0,0,0.4)", background: active ? "rgba(0,0,0,0.05)" : "transparent" }}>
            <item.icon size={15} />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
