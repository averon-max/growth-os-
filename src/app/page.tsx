import type { Metadata } from "next";
import { display, mono } from "./fonts";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";

import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";
import { planPrices, formatPrice } from "@/lib/billing/prices";
import { highlights } from "@/lib/billing/features";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/billing/trial";

import styles from "./landing.module.css";
import { LatestPosts } from "@/components/blog/latest-posts";
import { SiteHeader, SiteFooter } from "@/components/site/site-shell";

export const metadata: Metadata = {
  title: "Hyprlyx — plan, write and rank in one SEO workspace",
  description:
    "Keyword research, Search Console, traffic, competitors, backlinks and AI-written articles in one workspace, so your team knows what to publish next and why.",
  alternates: { canonical: "/" },
};

type Shot = { src: string; alt: string; w: number; h: number };

/*
 * Each section, Linear-style: a big title on the left, one paragraph and "Learn more" on the right,
 * then the real product screen fading out at the edges, and a short row of related features.
 */
const SECTIONS: { id: string; title: [string, string]; text: string; href: string; shots: Shot[]; features: { label: string; href: string }[] }[] = [
  {
    id: "traffic",
    title: ["Traffic you", "can trust"],
    text: "Cloudflare visits and Google clicks side by side, day by day, with the countries and pages behind every change. One source of numbers on every screen.",
    href: "/product/traffic",
    shots: [{ src: "/landing/traffic-v11.webp", alt: "Traffic report: visits by country and top pages, day by day", w: 2048, h: 1110 }],
    features: [
      { label: "Traffic report", href: "/product/traffic" },
      { label: "Audience", href: "/product/traffic" },
      { label: "Rankings", href: "/product/rankings" },
      { label: "Search Console", href: "/product/rankings" },
    ],
  },
  {
    id: "planner",
    title: ["Plan what", "to write next"],
    text: "Every keyword you rank for or want to, with volume, difficulty, CPC and the page that should win it. Quick wins, gaps and cannibalization surface on their own.",
    href: "/product/planner",
    shots: [{ src: "/landing/planner-v11.webp", alt: "Keyword Planner with positions, intent and pages", w: 2048, h: 1110 }],
    features: [
      { label: "Keyword Planner", href: "/product/planner" },
      { label: "Keyword research", href: "/product/keywords" },
      { label: "Content", href: "/product/content" },
      { label: "Site audit", href: "/product/audit" },
    ],
  },
  {
    id: "competitors",
    title: ["Know who", "you're up against"],
    text: "Track competitors' keywords, traffic and referring domains, and see the links pointing at you — spam and all. Paid data is saved, so looking again costs nothing.",
    href: "/product/competitors",
    shots: [
      { src: "/landing/competitors-v11.webp", alt: "Competitors: tracked domains, gaps and who wins your keywords", w: 1585, h: 930 },
      { src: "/landing/backlinks-v11.webp", alt: "Backlinks: link quality, types, anchors and new linking domains", w: 1586, h: 860 },
    ],
    features: [
      { label: "Competitors", href: "/product/competitors" },
      { label: "Backlinks", href: "/product/backlinks" },
      { label: "Search landscape", href: "/product/competitors" },
    ],
  },
  {
    id: "bots",
    title: ["See every", "crawler"],
    text: "Google, Bing, ChatGPT, Claude and Perplexity — which bots visit, how often and which pages they read, verified by Cloudflare.",
    href: "/product/traffic",
    shots: [{ src: "/landing/bots-v11.webp", alt: "Bots and crawlers: verified bots by category and most crawled pages", w: 2048, h: 1110 }],
    features: [
      { label: "AI crawlers", href: "/product/traffic" },
      { label: "Search engines", href: "/product/traffic" },
      { label: "Bot share", href: "/product/traffic" },
    ],
  },
];

const WORKS_WITH = ["Google Search Console", "Google Analytics 4", "Cloudflare", "DataForSEO", "Google Trends"];
const PAID = ["STARTER", "GROWTH", "AUTOPILOT"] as const;

export const revalidate = 3600;

export default async function LandingPage() {
  const prices = await planPrices();
  return (
    <div className={`${styles.page} ${display.variable} ${mono.variable}`}>
      <SiteHeader />

      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <Link href="/product/competitors" className={styles.news}>
              <span className={styles.newsTag}>New</span>
              Competitor & backlink tracking <ArrowRight size={14} />
            </Link>
            <h1 className={styles.heroTitle}>
              The SEO workspace
              <br />
              for teams that publish
            </h1>
            <div className={styles.heroRow}>
              <p className={styles.heroLede}>
                Keyword research, Search Console, traffic, competitors and AI-written articles in one place, so your team knows what to publish next and why.
              </p>
              <div className={styles.actions}>
                <Link href="/signup" className={styles.pill}>Start free</Link>
                <Link href="/pricing" className={styles.pillDark}>See pricing</Link>
              </div>
            </div>
          </div>
          <div className={styles.heroStage}>
            <div className={styles.heroShot}>
              <Image src="/landing/overview-v11.webp" alt="Hyprlyx overview: website, Google Search, traffic, countries map and keywords" width={2048} height={1110} priority quality={90} sizes="(max-width: 1320px) 100vw, 1320px" />
            </div>
          </div>
        </section>

        <section className={styles.works} aria-label="Works with">
          <div className={styles.container}>
            <ul className={styles.worksList}>
              {WORKS_WITH.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        </section>

        {SECTIONS.map((sec) => (
          <section key={sec.id} id={sec.id} className={styles.block}>
            <div className={styles.container}>
              <div className={styles.blockHead}>
                <h2 className={styles.blockTitle}>
                  {sec.title[0]}
                  <br />
                  {sec.title[1]}
                </h2>
                <div>
                  <p className={styles.blockText}>{sec.text}</p>
                  <Link href={sec.href} className={styles.learn}>
                    Learn more <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>

            <div className={sec.shots.length > 1 ? styles.stagePair : styles.stage}>
              {sec.shots.map((shot, i) => (
                <div key={shot.src} className={i === 0 ? styles.shot : `${styles.shot} ${styles.shotBack}`}>
                  <Image src={shot.src} alt={shot.alt} width={shot.w} height={shot.h} quality={90} sizes="(max-width: 1320px) 100vw, 1320px" />
                </div>
              ))}
            </div>

            <div className={styles.container}>
              <div className={styles.features}>
                <span className={styles.featuresLabel}>Features</span>
                <ul>
                  {sec.features.map((f) => (
                    <li key={f.label}>
                      <Link href={f.href}>
                        {f.label} <Plus size={15} strokeWidth={1.6} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}

        <section id="pricing" className={styles.block}>
          <div className={styles.container}>
            <div className={styles.blockHead}>
              <h2 className={styles.blockTitle}>
                Simple,
                <br />
                monthly pricing
              </h2>
              <div>
                <p className={styles.blockText}>Try Starter free for {TRIAL_DAYS} days. Upgrade when you need the AI writer and more websites. Cancel anytime.</p>
                <Link href="/pricing" className={styles.learn}>
                  Compare plans <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className={styles.plans}>
              {PAID.map((id) => {
                const plan = PLANS[id];
                const popular = id === "GROWTH";
                return (
                  <div key={id} className={popular ? `${styles.plan} ${styles.planPopular}` : styles.plan}>
                    <div className={styles.planHead}>
                      <h3 className={styles.planName}>{plan.name}</h3>
                      {id === "STARTER" ? <span className={styles.planTag}>{TRIAL_DAYS} days free</span> : popular ? <span className={styles.planTag}>Most popular</span> : null}
                    </div>
                    <p className={styles.price}>
                      {formatPrice(prices[id])}
                      <span className={styles.per}>/ month</span>
                    </p>
                    <ul className={styles.planList}>
                      {highlights(id).map((item) => (
                        <li key={item}>
                          <Check size={15} strokeWidth={2.2} />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <SubscribeButton plan={id} label={id === TRIAL_PLAN ? `Start ${TRIAL_DAYS}-day free trial` : `Choose ${plan.name}`} variant={popular ? "accent" : "light"} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <LatestPosts />

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Start ranking today.</h2>
          <div className={styles.ctaActions}>
            <Link href="/signup" className={styles.pillLarge}>Get started</Link>
            <Link href="/support" className={styles.pillLargeDark}>Contact us</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
