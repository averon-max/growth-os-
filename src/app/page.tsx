import type { Metadata } from "next";
import { display, mono } from "./fonts";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";
import { planPrices, formatPrice } from "@/lib/billing/prices";
import { highlights } from "@/lib/billing/features";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/billing/trial";

import styles from "./landing.module.css";
import { LatestPosts } from "@/components/blog/latest-posts";
import { SiteHeader, SiteFooter, siteStyles as s } from "@/components/site/site-shell";
import { INTEGRATIONS } from "@/components/site/features";
import { pageMeta, ORGANIZATION } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const HOME_DESCRIPTION =
  "All-in-one SEO software: keyword research, rank tracking with Search Console, site audits, backlinks, competitor analysis, AI crawler tracking and an AI writer. Free 7-day trial.";

export const metadata: Metadata = pageMeta("Hyprlyx: SEO Software for Keyword Research & Rank Tracking", HOME_DESCRIPTION, "/", {
  title: { absolute: "Hyprlyx: SEO Software for Keyword Research & Rank Tracking" },
});

type Shot = { src: string; alt: string; w: number; h: number };
type Block = { id: string; title: [string, string]; text: string; href: string; shots: Shot[]; features: { label: string; href: string }[] };

const SECTIONS: Block[] = [
  {
    id: "traffic",
    title: ["Traffic you", "can trust"],
    text: "Cloudflare visits and Google clicks side by side, day by day, with the countries and pages behind every change. One source of numbers on every screen.",
    href: "/product/traffic",
    shots: [{ src: "/landing/traffic-v11.webp", alt: "Traffic report: visits by country and top pages, day by day", w: 2048, h: 1110 }],
    features: [
      { label: "Traffic report", href: "/product/traffic" },
      { label: "Countries map", href: "/product/traffic" },
      { label: "Rankings", href: "/product/rankings" },
      { label: "Search Console", href: "/product/rankings" },
    ],
  },
  {
    id: "planner",
    title: ["Plan what", "to write next"],
    text: "Every keyword you rank for or want to, with volume, difficulty, CPC and the page that should win it. Quick wins, gaps and clusters surface on their own.",
    href: "/product/planner",
    shots: [{ src: "/landing/planner-v11.webp", alt: "Keyword Planner with positions, intent and pages", w: 2048, h: 1110 }],
    features: [
      { label: "Keyword Planner", href: "/product/planner" },
      { label: "Keyword research", href: "/product/keywords" },
      { label: "Google Trends", href: "/product/keywords" },
      { label: "Site audit", href: "/product/audit" },
    ],
  },
  {
    id: "content",
    title: ["Write when the", "data says so"],
    text: "When a gap needs a page, get a brief built from what already ranks, and a draft to review if you want one. Nothing goes live without your approval.",
    href: "/product/content",
    shots: [{ src: "/landing/content-v10.webp", alt: "Content library with AI-written drafts, formats and approval status", w: 3200, h: 2000 }],
    features: [
      { label: "Briefs", href: "/product/content" },
      { label: "AI drafts", href: "/product/content" },
      { label: "Approval", href: "/product/content" },
      { label: "CMS publishing — soon", href: "/product/content" },
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
      { label: "Keyword gaps", href: "/product/competitors" },
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

const PRINCIPLES = [
  ["Real data, not guesses", "Impressions, clicks, visits and rankings come straight from Google, Cloudflare and DataForSEO. If the evidence is thin, Hyprlyx says so."],
  ["One source of numbers", "The overview, the map and every report read the same traffic data, so the figures agree wherever you look."],
  ["You stay in control", "Read-only connections, paid data only when you press the button, and a person approves every page."],
];

const STEPS = [
  ["Add your website", "Connect Search Console, Analytics or Cloudflare in a couple of clicks. Read-only."],
  ["See where you stand", "Traffic, rankings, countries and crawlers in one overview, from day one."],
  ["Pick what to work on", "Quick wins, gaps and audit issues, ordered by how much traffic they can move."],
  ["Publish and measure", "Brief, draft, approve, publish — then watch the page in rankings and traffic."],
];

const COMPARE = [
  ["Keyword ideas", "A separate keyword tool", "Keyword research with Google Trends"],
  ["What to write next", "A spreadsheet you keep by hand", "Keyword Planner: quick wins, gaps, clusters"],
  ["Rankings", "Search Console in another tab", "Search Console inside each report"],
  ["Traffic", "Analytics and Cloudflare dashboards", "One traffic report with a source switch"],
  ["AI crawlers", "Raw server logs", "Verified bots by category and page"],
  ["Competitors and links", "Another paid suite", "Competitors and backlinks, saved and reused"],
  ["Drafts", "A writer tool and copy-paste", "Briefs and drafts from what ranks, with approval"],
];

const PAID = ["STARTER", "GROWTH", "AUTOPILOT"] as const;
const n = (v: number) => v.toLocaleString("en-US");

const FAQ: [string, string][] = [
  ["What is Hyprlyx?", "An SEO workspace that brings keyword research, Search Console, traffic, competitors, backlinks and AI-written drafts together, so you can see where you stand and decide what to publish next."],
  ["Who is it for?", `Founders and marketers growing one site, content teams publishing every week, and agencies running many sites — Autopilot covers up to ${n(PLANS.AUTOPILOT.limits.websites)} websites.`],
  ["Where does the data come from?", "Google Search Console for impressions, clicks and positions; Google Analytics 4 and Cloudflare for visits, countries and crawlers; DataForSEO for keyword, SERP, competitor and backlink data; Google Trends for rising searches."],
  ["Do I need Search Console or Google Analytics?", "No, but connecting them unlocks your real rankings and traffic. Both are free Google products, and Hyprlyx only reads from them."],
  ["How does the free trial work?", `Starter is free for ${TRIAL_DAYS} days. You add a card at checkout and nothing is charged during the trial. Cancel before it ends in Settings → Billing and you pay nothing.`],
  ["Will I be charged extra for data?", "No. Data is included in your plan with a daily and monthly allowance shown in Billing. Paid data is bought only when you ask for it, then saved — opening the same report again costs nothing."],
  ["How many websites and keywords can I track?", `Starter: ${n(PLANS.STARTER.limits.websites)} website and ${n(PLANS.STARTER.limits.trackedKeywords)} tracked keywords. Growth: ${n(PLANS.GROWTH.limits.websites)} websites and ${n(PLANS.GROWTH.limits.trackedKeywords)}. Autopilot: ${n(PLANS.AUTOPILOT.limits.websites)} websites and ${n(PLANS.AUTOPILOT.limits.trackedKeywords)}.`],
  ["Does the AI publish to my site?", "No. The writer prepares briefs and drafts; a person reviews and approves every page. Direct publishing to WordPress and other CMSs is coming soon."],
  ["Can I see AI crawlers like GPTBot or ClaudeBot?", "Yes. Connect Cloudflare and Hyprlyx shows verified search and AI crawlers, how often they visit and which pages they read."],
  ["Which countries and languages are supported?", "Any market and language DataForSEO covers. You choose the market for each website."],
  ["Can I delete my data?", "Yes. Settings → Data shows everything stored for your workspace, and each kind can be deleted with one button. You can also delete your whole account."],
  ["Can I cancel anytime?", "Yes. Cancel in Settings → Billing and keep access until the end of the period you paid for. No contracts."],
];

export const revalidate = 3600;

export default async function LandingPage() {
  const prices = await planPrices();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      ORGANIZATION,
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: "Hyprlyx", url: SITE_URL, publisher: { "@id": `${SITE_URL}/#org` } },
      {
        "@type": "SoftwareApplication",
        name: "Hyprlyx",
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "SEO software",
        operatingSystem: "Web",
        description: HOME_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#org` },
        offers: PAID.map((id) => ({ "@type": "Offer", name: PLANS[id].name, price: prices[id], priceCurrency: "USD", url: `${SITE_URL}/pricing` })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };

  return (
    <div className={`${styles.page} ${display.variable} ${mono.variable}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
                Keyword research, Search Console, traffic, competitors and AI-written drafts in one place, so your team knows what to publish next and why.
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
              {INTEGRATIONS.filter((i) => !i.name.includes("CMS")).map((i) => (
                <li key={i.name}>{i.name}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.statement}>
          <div className={styles.container}>
            <p className={styles.statementText}>
              Growing search traffic shouldn&apos;t take five tools and a spreadsheet. <span>Hyprlyx puts your rankings, traffic, keywords and competitors on one
              screen, and turns them into a short list of what to do next.</span>
            </p>
            <div className={s.grid3}>
              {PRINCIPLES.map(([t, d]) => (
                <div key={t} className={s.cell}>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
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
                      <Link href={f.href}>{f.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}

        <section className={styles.block}>
          <div className={styles.container}>
            <div className={styles.blockHead}>
              <h2 className={styles.blockTitle}>
                From signup
                <br />
                to your first page
              </h2>
              <p className={styles.blockText}>Four steps. The first two take a few minutes; the rest is the work that actually grows traffic.</p>
            </div>
            <div className={s.steps}>
              {STEPS.map(([t, d]) => (
                <div key={t} className={s.step}>
                  <b>{t}</b>
                  <small>{d}</small>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.container}>
            <div className={styles.blockHead}>
              <h2 className={styles.blockTitle}>
                Five tabs,
                <br />
                or one workspace
              </h2>
              <p className={styles.blockText}>The jobs an SEO team does every week, and where they usually live.</p>
            </div>
            <div className={s.compare}>
              <div className={s.compareRow}>
                <span className={s.compareHead}>Job</span>
                <span className={s.compareHead}>Usually</span>
                <span className={s.compareHead}>In Hyprlyx</span>
              </div>
              {COMPARE.map(([job, before, after]) => (
                <div key={job} className={s.compareRow}>
                  <span>{job}</span>
                  <span>{before}</span>
                  <span>{after}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.container}>
            <div className={styles.blockHead}>
              <h2 className={styles.blockTitle}>
                Predictable cost,
                <br />
                your data, your call
              </h2>
              <div>
                <p className={styles.blockText}>Paid data is bought only when you press the button, then saved. Your plan&apos;s allowance is visible in Billing, and anything stored can be deleted.</p>
                <Link href="/about" className={styles.learn}>
                  How we handle data <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className={`${s.stats} ${s.stats4}`}>
              <div className={s.stat}>
                <b>$0</b>
                <span>to open a saved report again</span>
              </div>
              <div className={s.stat}>
                <b>Read-only</b>
                <span>connections to Google and Cloudflare</span>
              </div>
              <div className={s.stat}>
                <b>100%</b>
                <span>of pages approved by a person before they go anywhere</span>
              </div>
              <div className={s.stat}>
                <b>1 click</b>
                <span>to delete any stored data in Settings</span>
              </div>
            </div>
          </div>
        </section>

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

            <div className={s.plans}>
              {PAID.map((id) => {
                const plan = PLANS[id];
                const popular = id === "GROWTH";
                return (
                  <div key={id} className={popular ? `${s.plan} ${s.planPopular}` : s.plan}>
                    <div className={s.planHead}>
                      <h3 className={s.planName}>{plan.name}</h3>
                      {id === "STARTER" ? <span className={s.planTag}>{TRIAL_DAYS} days free</span> : popular ? <span className={s.planTag}>Most popular</span> : null}
                    </div>
                    <p className={s.price}>
                      {formatPrice(prices[id])}
                      <span className={s.per}>/ month</span>
                    </p>
                    <ul className={s.planList}>
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

        <section id="faq" className={styles.block}>
          <div className={styles.container}>
            <div className={s.faqWrap}>
              <div>
                <h2 className={styles.blockTitle}>Questions</h2>
                <p className={s.small} style={{ marginTop: 20, fontSize: 16 }}>
                  Something else? <Link href="/support" style={{ color: "var(--soft)" }}>Ask us</Link>.
                </p>
              </div>
              <div className={s.faq}>
                {FAQ.map(([q, a]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className={styles.posts}>
          <LatestPosts />
        </div>

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
