import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";

export const metadata: Metadata = { title: "About · Hyprlyx", description: "Why we built Hyprlyx and how we treat your data.", alternates: { canonical: "/about" } };

const VALUES = [
  ["Evidence over guesses", "Every recommendation shows the data behind it. When there isn't enough evidence, we say so instead of inventing advice."],
  ["Your data stays yours", "We read what you connect, never sell it, and never use it to train AI models. Delete any of it from Settings whenever you want."],
  ["Calm software", "One clean workspace instead of ten tabs. Fewer dashboards, clearer next steps."],
];

const PROMISES = [
  ["Read-only by default", "Search Console, Analytics and Cloudflare are connected with read access. Nothing on your site changes unless you approve it."],
  ["You press the button", "Paid data is bought only when you ask for it, then saved and reused. Opening a report again costs nothing."],
  ["Drafts, not autopilot", "The AI writer prepares drafts from what already ranks. A person reviews and approves every page before it goes anywhere."],
  ["Clear limits", "Each plan has a daily and monthly data allowance, shown in Billing, so there are no surprises on either side."],
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className={s.hero}>
        <div className={s.container}>
          <p className={s.eyebrow}>About</p>
          <h1 className={s.h1}>
            SEO without
            <br />
            the guesswork
          </h1>
          <div className={s.heroRow}>
            <p className={s.lede}>
              Growing search traffic usually means juggling keyword tools, Search Console, analytics, crawlers and spreadsheets — and still guessing what to
              do next. Hyprlyx puts that data in one place and turns it into a short, honest list of what to work on.
            </p>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>What we believe</h2>
            <p className={s.muted}>Three ideas shape every screen we build.</p>
          </div>
          <div className={s.grid3}>
            {VALUES.map(([t, d]) => (
              <div key={t} className={s.cell}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>
              How we handle
              <br />
              your site and data
            </h2>
            <div>
              <p className={s.muted}>The rules the product follows, written down.</p>
              <Link href="/privacy" className={s.learn}>
                Privacy Policy <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className={s.grid4}>
            {PROMISES.map(([t, d]) => (
              <div key={t} className={s.cell}>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.cta}>
        <h2 className={s.h2}>Questions or ideas?</h2>
        <p className={s.small} style={{ marginTop: 20, fontSize: 17 }}>We read every message.</p>
        <div className={s.actions}>
          <Link href="/support" className={s.pill}>Contact us</Link>
          <Link href="/product" className={s.pillDark}>Explore the product</Link>
        </div>
      </section>
    </SiteShell>
  );
}
