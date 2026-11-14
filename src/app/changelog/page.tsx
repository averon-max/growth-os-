import type { Metadata } from "next";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";

export const metadata: Metadata = { title: "Changelog · Hyprlyx", description: "New features and improvements in Hyprlyx.", alternates: { canonical: "/changelog" } };

// Newest first. Add an entry for every release.
const ENTRIES = [
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
