import type { ReactNode } from "react";
import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import s from "./settings-shell.module.css";

/*
 * Every settings page uses this frame (Vercel-style): the same top bar and one content column,
 * so General, Account, Billing and Data look the same however you got there.
 */
// The list of sections lives only in the sidebar (SUBNAV in lib/nav.ts); this frame has no menu of its own.
const SECTIONS = [
  { key: "general", label: "General" },
  { key: "account", label: "Account" },
  { key: "billing", label: "Billing" },
  { key: "data", label: "Data and costs" },
] as const;

export type SettingsSection = (typeof SECTIONS)[number]["key"];

export function SettingsShell({ active, title, description, children }: { active: SettingsSection; title: string; description?: ReactNode; children: ReactNode }) {
  const current = SECTIONS.find((x) => x.key === active);
  return (
    <>
      <Topbar title="Settings" subtitle={current?.label} />
      <div className={ui.pageBody}>
        <div className={s.frame}>
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
