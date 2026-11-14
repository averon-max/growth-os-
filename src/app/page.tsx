import type { Metadata } from "next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";

import styles from "./landing.module.css";
import { SiteHeader, SiteFooter } from "@/components/site/site-shell";

const display = Newsreader({ subsets: ["latin"], variable: "--font-landing-display", display: "swap" });

const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-landing-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hyprlyx — plan, write and rank in one SEO workspace",
  description:
    "Keyword research, Search Console, AI-written articles and backlinks in one workspace, so your team knows what to publish next and why.",
  alternates: { canonical: "/" },
};

const SECTIONS = [
  {
    id: "keywords",
    label: "Keyword research",
    title: "Know what people search for",
    text: "Volume, difficulty, CPC and trend for every keyword, plus rising searches from Google Trends — before you decide what to write.",
    src: "/landing/keywords-v10.webp",
    alt: "Keyword research: rising and top searches with volume, difficulty and CPC",
  },
  {
    id: "visibility",
    label: "Rankings",
    title: "See where you stand",
    text: "Impressions, clicks and positions straight from Search Console, with the queries closest to page one surfaced first.",
    src: "/landing/search-console-v10.webp",
    alt: "Search Console view with impressions, average position and easiest wins",
  },
  {
    id: "writer",
    label: "Content",
    title: "Turn findings into pages",
    text: "When a gap needs a page, get a brief based on what already ranks — and a draft to review if you want one. Nothing goes live without your approval.",
    src: "/landing/content-v10.webp",
    alt: "Content library with AI-written drafts, formats and approval status",
  },
];

const WORKS_WITH = ["Google Search Console", "Google Analytics 4", "Cloudflare", "DataForSEO", "Google Trends"];

const PLAN_FEATURES = {
  STARTER: [
    "Website monitoring",
    "SEO analysis",
    "Keyword intelligence",
    "Opportunity tracking",
    "Monthly reports",
  ],
  GROWTH: [
    "Everything in Starter",
    "Search Console integration",
    "Audience analytics",
    "Content opportunities",
    "Competitor monitoring",
    "Automations",
  ],
  AUTOPILOT: [
    "Everything in Growth",
    "Advanced automation",
    "Content workflows",
    "Advanced competitors",
    "Continuous optimization",
    "Priority processing",
  ],
} as const;

const PAID = ["STARTER", "GROWTH", "AUTOPILOT"] as const;



export default function LandingPage() {
  return (
    <div className={`${styles.page} ${display.variable} ${mono.variable}`}>
      <SiteHeader />

      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <Link href="/product/competitors" className={styles.news}>
              <span className={styles.newsTag}>New</span>
              <span className={styles.newsText}>
                Competitor & backlink tracking <ArrowRight size={15} />
              </span>
            </Link>

            <h1 className={styles.heroTitle}>Plan, write and rank in one workspace</h1>

            <p className={styles.heroLede}>
              Hyprlyx brings keyword research, Search Console, AI-written articles and backlinks
              together, so your team knows what to publish next and why.
            </p>

            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.pill}>Start free</Link>
              <Link href="/pricing" className={styles.textLink}>
                See pricing <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className={styles.heroStage}>
          <div className={styles.heroShotWrap}>
            <div className={styles.heroShot}>
              <Image
                src="/landing/planner-v10.webp"
                alt="Keyword Planner: tracked keywords, pages without content and current rankings"
                width={3200}
                height={2000}
                priority
                unoptimized
                sizes="(max-width: 1240px) 100vw, 1200px"
              />
            </div>
          </div>
          </div>
        </section>

        <section className={styles.worksWith} aria-label="Works with">
          <div className={styles.container}>
            <p className={styles.eyebrow}>Works with</p>
            <ul className={styles.worksWithList}>
              {WORKS_WITH.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className={styles.block}>
            <div className={styles.container}>
              <div className={styles.blockHead}>
                <div>
                  <p className={styles.eyebrow}>
                    <span className={styles.eyebrowNum}></span> {section.label}
                  </p>
                  <h2 className={styles.blockTitle}>{section.title}</h2>
                </div>
                <p className={styles.blockText}>{section.text}</p>
              </div>

              <div className={styles.blockCard}>
                <div className={styles.blockShot}>
                  <Image
                    src={section.src}
                    alt={section.alt}
                    width={3200}
                    height={2000}
                    sizes="(max-width: 1240px) 100vw, 1200px"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </section>
        ))}

        <section id="pricing" className={styles.block}>
          <div className={styles.container}>
            <div className={styles.blockHead}>
              <div>
                <p className={styles.eyebrow}>
                  <span className={styles.eyebrowNum}></span> Pricing
                </p>
                <h2 className={styles.blockTitle}>Simple, monthly pricing</h2>
              </div>
              <p className={styles.blockText}>
                Start free with one site. Upgrade when you need more sites, articles and data.
              </p>
            </div>

            <div className={styles.plans}>
              {PAID.map((id) => {
                const plan = PLANS[id];
                const popular = id === "GROWTH";
                return (
                  <div key={id} className={popular ? `${styles.plan} ${styles.planPopular}` : styles.plan}>
                    <div className={styles.planHead}>
                      <h3 className={styles.planName}>{plan.name}</h3>
                      {popular ? <span className={styles.planTag}>Most popular</span> : null}
                    </div>
                    <p className={styles.price}>
                      ${plan.priceMonthlyUsd}
                      <span className={styles.per}>/ month</span>
                    </p>
                    <ul className={styles.planList}>
                      {PLAN_FEATURES[id].map((item) => (
                        <li key={item}>
                          <Check size={15} strokeWidth={2.2} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <SubscribeButton
                      plan={id}
                      label={`Choose ${plan.name}`}
                      variant={popular ? "accent" : "light"}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.container}>
            <h2 className={styles.ctaTitle}>
              Start growing your
              <br />
              search traffic today
            </h2>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.pill}>Start free</Link>
              <Link href="/pricing" className={styles.textLink}>
                See pricing <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
