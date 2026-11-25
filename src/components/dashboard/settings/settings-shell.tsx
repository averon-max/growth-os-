import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, Database, Settings2, UserRound } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import s from "./settings-shell.module.css";

/*
 * Every settings page uses this frame (Vercel-style): the same top bar, a left list of sections and one content column,
 * so General, Account, Billing and Data look the same however you got there.
 */
const SECTIONS = [
  { key: "general", label: "General", href: "/dashboard/settings", icon: Settings2 },
  { key: "account", label: "Account", href: "/dashboard/settings/account", icon: UserRound },
  { key: "billing", label: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
  { key: "data", label: "Data and costs", href: "/dashboard/settings/data", icon: Database },
] as const;

export type SettingsSection = (typeof SECTIONS)[number]["key"];

export function SettingsShell({ active, title, description, children }: { active: SettingsSection; title: string; description?: ReactNode; children: ReactNode }) {
  const current = SECTIONS.find((x) => x.key === active);
  return (
    <>
      <Topbar title="Settings" subtitle={current?.label} />
      <div className={ui.pageBody}>
        <div className={s.frame}>
          <nav className={s.nav} aria-label="Settings">
            {SECTIONS.map(({ key, label, href, icon: Icon }) => (
              <Link key={key} href={href} className={s.link} data-active={key === active || undefined} aria-current={key === active ? "page" : undefined}>
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <div className={s.content}>
            <header className={s.head}>
              <h1 className={s.title}>{title}</h1>
              {description ? <p className={s.desc}>{description}</p> : null}
            </header>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
