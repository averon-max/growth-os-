import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";

export const metadata: Metadata = { title: "About · Hyprlyx", description: "Why we built Hyprlyx.", alternates: { canonical: "/about" } };

const VALUES = [
  ["Evidence over guesses", "Every recommendation shows the data behind it. When there isn't enough evidence, we say so instead of inventing advice."],
  ["Your data stays yours", "We read what you connect, never sell it, and never use it to train AI models. Export or delete it anytime."],
  ["Calm software", "One clean workspace instead of ten tabs. Fewer dashboards, clearer next steps."],
];

export default function AboutPage() {
  return (
    <SiteShell>
      <section className={s.hero}>
        <div className={s.narrow}>
          <p className={s.eyebrow}>About</p>
          <h1 className={s.h1}>SEO without the guesswork</h1>
          <p className={s.lede}>
            Growing search traffic usually means juggling keyword tools, Search Console, analytics, crawlers and spreadsheets — and still guessing
            what to do next. Hyprlyx puts that data in one place and turns it into a short, honest list of what to work on.
          </p>
        </div>
      </section>
      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}><h2 className={s.h2}>What we believe</h2><span /></div>
          <div className={s.grid3}>{VALUES.map(([t, d]) => <div key={t} className={s.cell}><h3>{t}</h3><p>{d}</p></div>)}</div>
        </div>
      </section>
      <section className={s.cta}>
        <div className={s.container}>
          <h2 className={s.h2}>Questions or ideas?</h2>
          <p className={s.muted} style={{ marginTop: 14 }}>We read every message.</p>
          <div className={s.actions}>
            <Link href="/support" className={s.pill}>Contact us</Link>
            <Link href="/product" className={s.textLink}>Explore the product <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
