import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Compass,
  FileText,
  Globe2,
  LifeBuoy,
  LayoutDashboard,
  Link2,
  Plug,
  Plus,
  ScanSearch,
  Settings,
  ShieldCheck,
  Tags,
  Target,
  Users,
} from "lucide-react";

/*
 * Единый список страниц дашборда.
 * Сайдбар и футер строятся отсюда — чтобы добавить страницу,
 * допиши одну строку в нужную секцию:
 *
 *   { label: "Reports", href: "/dashboard/reports", icon: BarChart3, badge: "New" },
 *
 * sidebar: false — только в футере; footer: false — только в сайдбаре.
 * badge — маленькая жёлтая метка (New, Beta).
 * match — дополнительные пути, на которых пункт подсвечивается.
 */

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  sidebar?: boolean;
  footer?: boolean;
  keepSite?: boolean;
  match?: string[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Site health and growth at a glance" },
      { label: "Websites", href: "/dashboard/websites", icon: Globe2, description: "Connected sites", match: ["/dashboard/add-website", "/dashboard/analysis"] },
    ],
  },
  {
    label: "Search",
    items: [
      { label: "Keywords", href: "/dashboard/keywords", icon: Tags, description: "Rankings, volume and clicks" },
      { label: "Keyword Planner", href: "/dashboard/keyword-planner", icon: Compass, description: "Research and tracked keywords" },
      { label: "Content", href: "/dashboard/content", icon: FileText, description: "Articles and opportunities" },
      { label: "Backlinks", href: "/dashboard/backlinks", icon: Link2, description: "Referring domains, links and anchors" },
      { label: "Competitors", href: "/dashboard/competitors", icon: Target, description: "Tracked competitors and SERP landscape" },
    ],
  },
  {
    label: "Traffic",
    items: [
      { label: "Audience", href: "/dashboard/audience", icon: Users, description: "Visitors, countries and pages" },
      { label: "Bots & crawlers", href: "/dashboard/bots", icon: Bot, description: "Search and AI crawlers" },
    ],
  },
  {
    label: "Site",
    items: [
      { label: "SEO audit", href: "/dashboard/seo", icon: ScanSearch, description: "Technical SEO checks" },
      { label: "CMS", href: "/dashboard/cms", icon: Plug, description: "Publishing connections" },
    ],
  },
];

/* Нижний блок сайдбара. */
export const NAV_BOTTOM: NavItem[] = [
  { label: "Support", href: "/support", icon: LifeBuoy, description: "Contact support", keepSite: false },
  { label: "Settings", href: "/dashboard/settings", icon: Settings, description: "Workspace settings" },
];

/* Пункт только для администраторов. Сайдбар рисует его, если isAdmin. */
export const NAV_ADMIN: NavItem = {
  label: "Admin",
  href: "/dashboard/admin",
  icon: ShieldCheck,
  description: "Users, plans and access grants",
  keepSite: false,
};

/* Дополнительные колонки футера (в сайдбаре их нет). */
export const FOOTER_EXTRA: NavSection[] = [
  {
    label: "Account",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
      { label: "Add website", href: "/dashboard/add-website", icon: Plus },
      { label: "Support", href: "/support", icon: LifeBuoy, keepSite: false },
    ],
  },
];

type ParamsLike = { get(name: string): string | null };

/* Добавляет ?websiteId= к ссылке, чтобы выбранный сайт сохранялся между страницами. */
export function withSite(href: string, site?: string | null | ParamsLike): string {
  const id = typeof site === "string" ? site : site ? site.get("websiteId") : null;
  if (id == null || id === "") return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("websiteId", id);
  return `${path}?${params.toString()}`;
}

export function isActivePath(pathname: string, item: Pick<NavItem, "href" | "match">): boolean {
  const paths = [item.href, ...(item.match ?? [])];
  return paths.some((href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  });
}

/* Все пункты одним списком — для заголовков, поиска, хлебных крошек. */
export function allNavItems(): NavItem[] {
  return [...NAV.flatMap((s) => s.items), ...NAV_BOTTOM];
}

export function navItemFor(pathname: string): NavItem | undefined {
  return allNavItems()
    .filter((item) => isActivePath(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
