import type { Metadata } from "next";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";

export const metadata: Metadata = { title: "Changelog · Hyprlyx", description: "New features and improvements in Hyprlyx.", alternates: { canonical: "/changelog" } };

// Newest first. Add an entry for every release.
const ENTRIES = [
  { date: "November 27, 2026", title: "A new dashboard and website", items: [
    "Overview board: drag, resize in every direction and add widgets, with a smooth, settled feel.",
    "One traffic report everywhere: switch between Cloudflare and Google, pick 7, 14 or 28 days, and see countries on a new map.",
    "Bot share widget: verified search and AI crawlers against everything else, day by day.",
    "Competitor and backlink tracking, plus a Keywords tab in Site audit with rising searches from Google Trends.",
    "Settings → Data: see what is stored and delete any of it, plus a log of every paid data lookup.",
    "Plan usage in Billing, and a redesigned website.",
  ]},
  { date: "November 13, 2026", title: "Support, feedback and account settings", items: [
    "Contact support from any page and get a ticket number by email.",
    "Send feedback or report a bug from the Feedback button — the current page is attached automatically.",
    "New Account page: change your password, log out everywhere, or delete your account.",
    "Collapsible sidebar and a mobile menu in the app.",
  ]},
  { date: "November 12, 2026", title: "Sign in with Google", items: [
    "Create an account or log in with Google in one click.",
    "Choose how long reports, scans and drafts are kept in Settings → Data retention.",
  ]},
  { date: "November 10, 2026", title: "Security and a new look", items: [
    "Stronger login protection: rate limits, breached-password checks and single-use reset links.",
    "Changing your password now signs you out on every device.",
    "Redesigned website, login and sign-up pages.",
  ]},
];

export default function ChangelogPage() {
  return (
    <SiteShell>
      <section className={s.hero}>
        <div className={s.narrow}>
          <p className={s.eyebrow}>Changelog</p>
          <h1 className={s.h1}>What&apos;s new</h1>
          <p className={s.lede}>New features, improvements and fixes, newest first.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 96 }}>
        <div className={s.narrow}>
          {ENTRIES.map((e) => (
            <article key={e.date} className={s.log}>
              <time className={s.logDate}>{e.date}</time>
              <div><h2>{e.title}</h2><ul>{e.items.map((i) => <li key={i}>{i}</li>)}</ul></div>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
