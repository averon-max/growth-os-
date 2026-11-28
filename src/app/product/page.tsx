import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";
import { FEATURES, INTEGRATIONS } from "@/components/site/features";
import { pageMeta, breadcrumbs } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = pageMeta(
  "SEO Tools: Keyword Research, Audit & Backlinks | Hyprlyx",
  "All the SEO tools a team needs in one workspace: keyword research, keyword planner, rank tracking, AI writer, site audit, backlinks, competitors and AI crawler traffic.",
  "/product",
);

export default function ProductPage() {
  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Hyprlyx SEO tools",
              itemListElement: FEATURES.map((f, i) => ({ "@type": "ListItem", position: i + 1, name: f.name, url: `${SITE_URL}/product/${f.slug}` })),
            },
            breadcrumbs([{ name: "Home", path: "/" }, { name: "Product", path: "/product" }]),
          ]),
        }}
      />
      <section className={s.hero}>
        <div className={s.container}>
          <p className={s.eyebrow}>Product</p>
          <h1 className={s.h1}>
            Everything you need
            <br />
            to grow organic traffic
          </h1>
          <div className={s.heroRow}>
            <p className={s.lede}>
              Research keywords, plan pages, track rankings, audit your site, watch competitors and backlinks, and see who visits — people and AI crawlers — in
              one workspace built on real data.
            </p>
            <div className={s.actions}>
              <Link href="/signup" className={s.pill}>Start free</Link>
              <Link href="/pricing" className={s.pillDark}>See pricing</Link>
            </div>
          </div>
        </div>
        <div className={s.stage}>
          <div className={s.shot}>
            <Image src="/landing/overview-v11.webp" alt="Hyprlyx overview: website, Google Search, traffic, countries and keywords" width={2048} height={1110} priority quality={90} sizes="(max-width: 1320px) 100vw, 1320px" />
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>
              One workspace,
              <br />
              every signal
            </h2>
            <p className={s.muted}>
              Each tool works on its own and gets better together: research feeds the planner, the planner feeds your pages, rankings and traffic show what worked.
            </p>
          </div>
          <div className={s.grid4}>
            {FEATURES.map((f) => (
              <Link key={f.slug} href={`/product/${f.slug}`} className={s.cell}>
                <h3>{f.name}</h3>
                <p>{f.short}.</p>
                <span className={s.cellMore}>Learn more</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>
              Works with the tools
              <br />
              you already use
            </h2>
            <div>
              <p className={s.muted}>Connect in a couple of clicks. Hyprlyx reads your data; it never posts or changes anything without your approval.</p>
              <Link href="/signup" className={s.learn}>
                Connect your site <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className={s.grid3}>
            {INTEGRATIONS.map((i) => (
              <div key={i.name} className={s.cell}>
                <h3>{i.name}</h3>
                <p>{i.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.cta}>
        <h2 className={s.h2}>Start ranking today.</h2>
        <div className={s.actions}>
          <Link href="/signup" className={s.pill}>Get started</Link>
          <Link href="/support" className={s.pillDark}>Contact us</Link>
        </div>
      </section>
    </SiteShell>
  );
}
