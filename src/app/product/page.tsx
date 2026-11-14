import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";
import { FEATURES, INTEGRATIONS } from "@/components/site/features";

export const metadata: Metadata = {
  title: "Product · Hyprlyx",
  description: "Keyword research, rankings, site audit, backlinks, competitors and traffic in one SEO workspace.",
  alternates: { canonical: "/product" },
};

export default function ProductPage() {
  return (
    <SiteShell>
      <section className={s.hero}>
        <div className={s.container}>
          <p className={s.eyebrow}>Product</p>
          <h1 className={s.h1}>Everything you need to grow organic traffic</h1>
          <p className={s.lede}>
            Research keywords, track rankings, audit your site, watch competitors and backlinks, and see who visits — people and AI
            crawlers — in one workspace built around real data.
          </p>
          <div className={s.actions}>
            <Link href="/signup" className={s.pill}>Start free</Link>
            <Link href="/pricing" className={s.textLink}>See pricing <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div className={s.container} style={{ marginTop: 56 }}>
          <div className={s.shot}>
            <Image src="/landing/planner-v10.webp" alt="Hyprlyx Keyword Planner" width={3200} height={2000} priority unoptimized />
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>One workspace, every signal</h2>
            <p className={s.muted}>Each tool works on its own and gets better together: research feeds the planner, the planner feeds your pages, rankings show what worked.</p>
          </div>
          <div className={s.grid3} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Link key={f.slug} href={`/product/${f.slug}`} className={s.cell}>
                  <span className={s.cellIcon}><Icon size={17} strokeWidth={1.8} /></span>
                  <h3>{f.name}</h3>
                  <p>{f.short}.</p>
                  <span className={s.cellMore}>Learn more →</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>Works with the tools you already use</h2>
            <p className={s.muted}>Connect in a couple of clicks. Hyprlyx reads your data; it never posts or changes anything without your approval.</p>
          </div>
          <div className={s.grid3}>
            {INTEGRATIONS.map((i) => (
              <div key={i.name} className={s.cell}><h3>{i.name}</h3><p>{i.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.cta}>
        <div className={s.container}>
          <h2 className={s.h2} style={{ fontSize: "clamp(2.2rem,4.6vw,3.5rem)" }}>Start growing your<br />search traffic today</h2>
          <div className={s.actions}>
            <Link href="/signup" className={s.pill}>Start free</Link>
            <Link href="/support" className={s.textLink}>Talk to us <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
