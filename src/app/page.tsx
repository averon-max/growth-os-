import type { Metadata } from "next";
import { display, mono } from "./fonts";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Ban, CircleCheck, Eye, Trash2, UserCheck } from "lucide-react";

import { PLANS } from "@/lib/billing/plans";
import { planPrices } from "@/lib/billing/prices";
import { TRIAL_DAYS } from "@/lib/billing/trial";

import styles from "./landing.module.css";
import { LatestPosts } from "@/components/blog/latest-posts";
import { SiteHeader, SiteFooter, siteStyles as s } from "@/components/site/site-shell";
import { INTEGRATIONS } from "@/components/site/features";
import { StepArt, type StepArtKind } from "@/components/site/step-art";
import { PlanCards } from "@/components/site/plan-cards";
import { pageMeta, ORGANIZATION } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

const HOME_DESCRIPTION =
  "All-in-one SEO software: keyword research, rank tracking with Search Console, site audits, backlinks, competitor analysis, AI crawler tracking and an AI writer. Free 7-day trial.";

export const metadata: Metadata = pageMeta("Hyprlyx: SEO Software for Keyword Research & Rank Tracking", HOME_DESCRIPTION, "/", {
  title: { absolute: "Hyprlyx: SEO Software for Keyword Research & Rank Tracking" },
});

type Shot = { src: string; alt: string; w: number; h: number };
type Card = { src: string; alt: string; title: string; text: string };
type Chapter = {
  id: string;
  title: [string, string];
  text: string;
  href: string;
  link: string;
  shots: Shot[];
  caption: [string, string];
  cards?: [Card, Card];
  features: { label: string; href: string }[];
};

/*
 * The landing tells the product as five chapters, like Linear's product pages: a heading with a plain explanation,
 * one large screen in a lit frame with a caption, then two cards that each zoom into one part of the real product.
 * Every picture is a real Hyprlyx screen (site name and competitors hidden), never a mock-up.
 */
const CHAPTERS: Chapter[] = [
  {
    id: "rankings",
    title: ["Know where", "you rank"],
    text: "Hyprlyx reads Search Console every day and keeps the history, so every query has its position, clicks, impressions and CTR over time. You see which pages moved, by how much, and which ones are a small push away from page one.",
    href: "/product/rankings",
    link: "Rank tracking",
    shots: [{ src: "/landing/search-console-v23.webp", alt: "Keywords: queries, impressions, clicks and average position from Search Console, the visibility chart and the easiest wins", w: 3360, h: 2100 }],
    caption: ["Every query, every day", "Queries, impressions, clicks and average position from Search Console, with the daily visibility chart and the queries that are rising or closest to page one."],
    cards: [
      { src: "/landing/card-rank-kpis.webp", alt: "Queries and impressions with the split of positions into top 3, 4–10, 11–20 and beyond", title: "Where every query stands", text: "Each query falls into the top 3, positions 4 to 10, 11 to 20 or beyond, and the bar shows how your whole site is spread. Pick a number to chart it for 7, 28 or 90 days." },
      { src: "/landing/card-overview-search.webp", alt: "Google Search on the overview: clicks, impressions and average position with their change", title: "Search on the first screen", text: "The overview keeps clicks, impressions and average position for 7, 14 or 28 days, each with its change and a small trend, so you know how search is going before you open a report." },
    ],
    features: [
      { label: "Rank tracking", href: "/product/rankings" },
      { label: "Search Console", href: "/product/rankings" },
      { label: "Keyword research", href: "/product/keywords" },
    ],
  },
  {
    id: "planner",
    title: ["Plan what", "to write next"],
    text: "The Keyword Planner reads your sitemap, Search Console and Google's suggestions, then sorts every keyword into quick wins, gaps, clusters and pages that compete with each other. Each list ends in a clear next step: improve a page, write a new one, or merge two.",
    href: "/product/planner",
    link: "Keyword Planner",
    shots: [{ src: "/landing/planner-v23.webp", alt: "Keyword Planner with volume, difficulty, intent, positions and the page that ranks", w: 2048, h: 1110 }],
    caption: ["One list for every keyword", "Volume, difficulty, intent, your position and the page that ranks, side by side. Track any keyword in one click and follow it in Keywords."],
    cards: [
      { src: "/landing/card-planner-keywords.webp", alt: "Planner keywords on the overview with volume and position", title: "Your keywords next to your traffic", text: "The keywords you plan for sit on the overview with their monthly volume and current position, so a plan and its results are on one screen." },
      { src: "/landing/card-keyword-detail.webp", alt: "Keyword detail: monthly volume, difficulty, cost per click and ad competition", title: "Every number behind a keyword", text: "Open any keyword for its monthly volume, difficulty, cost per click and ad competition, and see in seconds whether it is worth a page." },
    ],
    features: [
      { label: "Keyword Planner", href: "/product/planner" },
      { label: "Keyword research", href: "/product/keywords" },
      { label: "Google Trends", href: "/product/keywords" },
    ],
  },
  {
    id: "backlinks",
    title: ["Know who", "links to you"],
    text: "Every site that links to you, with its rank, its anchor and a spam score that sorts it into clean, watch or spam. Add the sites you compete with and Hyprlyx puts their referring domains, keywords and traffic next to yours.",
    href: "/product/backlinks",
    link: "Backlinks",
    shots: [{ src: "/landing/backlinks-swarm-v25.webp", alt: "New linking domains by domain rank, month by month, over the Backlinks page", w: 3360, h: 2100 }],
    caption: ["Every link, scored", "Referring domains and backlinks with the domain rank, link quality by spam score, link types, top anchors, the rank of the sites that link to you and new linking domains month by month."],
    cards: [
      { src: "/landing/card-link-quality.webp", alt: "Link quality by spam score and link types with their shares", title: "Clean, watch or spam", text: "Each linking domain is sorted by its spam score: under 30 is clean, 30 to 49 is worth a look, 50 and up is spam. Pick a group to see only those domains." },
      { src: "/landing/card-new-domains.webp", alt: "Rank of linking sites and new linking domains for the last 12 months", title: "Where your links come from", text: "The rank of every site that links to you, and how many new domains linked each month, so a link-building push shows up as a taller bar." },
    ],
    features: [
      { label: "Backlinks", href: "/product/backlinks" },
      { label: "Competitors", href: "/product/competitors" },
      { label: "Keyword gaps", href: "/product/competitors" },
    ],
  },
  {
    id: "traffic",
    title: ["Traffic you", "can trust"],
    text: "Cloudflare counts every visit at the edge, including people who block analytics scripts, and Search Console counts what Google sends. Hyprlyx puts the two side by side, day by day, with the pages and countries behind every change.",
    href: "/product/traffic",
    link: "Traffic report",
    shots: [{ src: "/landing/traffic-v23.webp", alt: "Traffic report: visits by country and top pages, day by day", w: 2048, h: 1110 }],
    caption: ["One report, two sources", "Switch between Cloudflare visits and Google clicks without leaving the page. The overview, the map and every report read the same numbers."],
    cards: [
      { src: "/landing/card-countries.webp", alt: "Visits by country, day by day, with each country's share", title: "Visits by country, day by day", text: "Each day's visits split by country, with every country's share of the period next to it. A spike from one market shows up the day it happens." },
      { src: "/landing/card-cloudflare.webp", alt: "Cloudflare visitors and verified bots with their change", title: "People and bots, apart", text: "Visitors from Cloudflare for 7, 14 or 28 days, and the share of requests that came from verified bots, each with its change against the period before." },
    ],
    features: [
      { label: "Traffic report", href: "/product/traffic" },
      { label: "Countries map", href: "/product/traffic" },
      { label: "AI crawlers", href: "/product/traffic" },
    ],
  },
  {
    id: "content",
    title: ["Write when the", "data says so"],
    text: "When a gap needs a page, Hyprlyx builds a brief from the pages that rank for it today: the headings they share, the questions people ask, the facts they cite. Ask for a draft and it is written from that brief, in your site's voice.",
    href: "/product/content",
    link: "AI writer",
    shots: [{ src: "/landing/content-v23.webp", alt: "Content library with drafts, approved and published articles, their format, intent and length", w: 3360, h: 2100 }],
    caption: ["Every article in one place", "Drafts, approved and published articles with their format, intent and length. Nothing moves to Published until someone on your team approves it."],
    cards: [
      { src: "/landing/card-content-pipeline.webp", alt: "Articles, drafts and approved counts with filters by status", title: "From draft to live", text: "How many articles you have, how many wait for review and how many are ready, with one filter per status. The library reads like a pipeline, not a folder." },
      { src: "/landing/card-content-rows.webp", alt: "Article rows with format, intent, word count and Approve or Publish", title: "Format, intent and length on every row", text: "Each article shows its format, search intent and word count, with Approve and Publish right on the row, so a review takes one pass." },
    ],
    features: [
      { label: "Briefs", href: "/product/content" },
      { label: "AI drafts", href: "/product/content" },
      { label: "Approval", href: "/product/content" },
    ],
  },
];

const STEPS: [StepArtKind, string, string][] = [
  ["connect", "Connect your data", "Search Console, Analytics 4 and Cloudflare, read-only."],
  ["serp", "See where you rank", "Every query with its position and clicks; page-one candidates first."],
  ["chart", "Grow the pages that can move", "Quick wins, gaps and audit fixes, sorted by the traffic they can bring."],
  ["publish", "Publish and measure", "Brief, draft, approve, then follow the page in rankings and traffic."],
];

const PAID = ["STARTER", "GROWTH", "AUTOPILOT"] as const;

/* What Customize on the Overview does (see components/dashboard/board). */
const BOARD = [
  { title: "Drag any widget", text: "Pick it up by its title. The other widgets slide out of its way and settle when you let go.", icon: "M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" },
  { title: "Stretch from any edge", text: "Make a chart wider or a list taller. Sizes snap to a 24-column grid, so everything stays lined up.", icon: "M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" },
  { title: "14 widgets to choose from", text: "Google Search, Cloudflare traffic, crawlers, countries, keywords, articles and more. Add what you use, remove the rest.", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
];

const FAQ: [string, string, string?][] = [
  ["What is Hyprlyx?", "An SEO workspace that brings keyword research, Search Console, traffic, competitors, backlinks and AI-written drafts together, so you can see where you stand and decide what to publish next.", "/product"],
  ["Who is it for?", "Founders and marketers growing one site, content teams publishing every week, and agencies running many sites from one workspace.", "/product"],
  ["Where does the data come from?", "Google Search Console for impressions, clicks and positions; Google Analytics 4 and Cloudflare for visits, countries and crawlers; DataForSEO for keyword, SERP, competitor and backlink data; Google Trends for rising searches.", "/product/rankings"],
  ["Do I need Search Console or Google Analytics?", "No, but connecting them unlocks your real rankings and traffic. Both are free Google products, and Hyprlyx only reads from them."],
  ["How does the free trial work?", `Starter is free for ${TRIAL_DAYS} days. You add a card at checkout and nothing is charged during the trial. Cancel before it ends in Settings → Billing and you pay nothing.`, "/pricing"],
  ["Does the AI publish to my site?", "No. The writer prepares briefs and drafts; a person reviews and approves every page. Direct publishing to WordPress and other CMSs is coming soon.", "/product/content"],
  ["Can I change what the Overview shows?", "Yes. Click Customize on the Overview to drag widgets by their title, stretch them from any edge, add any of the 14 widgets or remove the ones you don't use. The layout is saved to your account, and Reset brings back the default."],
  ["Can I see AI crawlers like GPTBot or ClaudeBot?", "Yes. Connect Cloudflare and Hyprlyx shows verified search and AI crawlers, how often they visit and which pages they read.", "/product/traffic"],
  ["Which countries and languages are supported?", "Any market and language DataForSEO covers. You choose the market for each website."],
  ["Can I delete my data?", "Yes. Settings → Data shows everything stored for your workspace, and each kind can be deleted with one button. You can also delete your whole account.", "/about"],
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
              <Image unoptimized src="/landing/overview-customize-v24.webp" alt="Hyprlyx overview in Customize mode: the Countries map is stretched from its right edge while Top pages slides down; every widget shows its corner handles" width={3360} height={2100} priority />
            </div>
          </div>
          <div className={styles.container}>
            <div className={styles.board}>
              <div>
                <h2 className={styles.boardTitle}>An overview you arrange yourself</h2>
                <p className={styles.boardText}>Click Customize and build the screen you open every morning. The layout is saved to your account, not to one browser.</p>
              </div>
              <ul className={styles.boardGrid}>
                {BOARD.map((b) => (
                  <li key={b.title}>
                    <h3>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d={b.icon} />
                      </svg>
                      {b.title}
                    </h3>
                    <p>{b.text}</p>
                  </li>
                ))}
              </ul>
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
          </div>
        </section>

        {CHAPTERS.map((ch) => (
          <section key={ch.id} id={ch.id} className={styles.block}>
            <div className={styles.container}>
              <div className={styles.blockHead}>
                <h2 className={styles.blockTitle}>
                  {ch.title[0]}
                  <br />
                  {ch.title[1]}
                </h2>
                <div>
                  <p className={styles.blockText}>{ch.text}</p>
                  <Link href={ch.href} className={styles.learn}>
                    {ch.link} <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <figure className={styles.frame}>
                <div className={ch.shots.length > 1 ? styles.framePair : undefined}>
                  {ch.shots.map((shot) => (
                    <div key={shot.src} className={styles.frameShot} style={{ maxWidth: Math.round(shot.w / 2), marginInline: "auto" }}>
                      <Image unoptimized src={shot.src} alt={shot.alt} width={shot.w} height={shot.h} />
                    </div>
                  ))}
                </div>
                <figcaption className={styles.frameCaption}>
                  <h3>{ch.caption[0]}</h3>
                  <p>{ch.caption[1]}</p>
                </figcaption>
              </figure>

              {ch.cards ? (
              <div className={styles.cards}>
                {ch.cards.map((c) => (
                  <article key={c.title} className={styles.card}>
                    <div className={styles.cardVisual}>
                      <Image unoptimized src={c.src} alt={c.alt} width={1120} height={640} />
                    </div>
                    <h3>{c.title}</h3>
                    <p>{c.text}</p>
                  </article>
                ))}
              </div>
              ) : null}

              <div className={styles.features}>
                <span className={styles.featuresLabel}>Read more</span>
                <ul>
                  {ch.features.map((f) => (
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
                to page one
              </h2>
              <p className={styles.blockText}>Connecting takes a few minutes. After that, Hyprlyx keeps a short, ordered list of what will move your search traffic most.</p>
            </div>
            <div className={styles.stepCards}>
              {STEPS.map(([kind, t, d]) => (
                <div key={t} className={styles.stepCard}>
                  <StepArt kind={kind} />
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
                Your site,
                <br />
                your data
              </h2>
              <div>
                <p className={styles.blockText}>What Hyprlyx can see, what it keeps, and how to remove it.</p>
                <Link href="/about" className={styles.learn}>
                  How we handle data <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className={styles.trust}>
              <h3 className={styles.trustTitle}>
                Connect your data in a minute <span className={styles.accentPill}>Free</span>
              </h3>
              <p className={styles.trustLede}>Three read-only connections. Disconnect any of them in Settings.</p>
              <ul className={styles.trustList}>
                {[
                  ["Google Search Console", "clicks, impressions, positions"],
                  ["Google Analytics 4", "visitors, countries, pages"],
                  ["Cloudflare", "every visit and verified crawler"],
                ].map(([name, scope]) => (
                  <li key={name}>
                    <CircleCheck size={16} strokeWidth={1.7} className={styles.trustCheck} aria-hidden />
                    <span>
                      {name} <span className={styles.trustScope}>· {scope}</span>
                    </span>
                    <span>Read-only</span>
                  </li>
                ))}
              </ul>
              <div className={styles.trustGrid}>
                <div>
                  <h3><Eye size={16} strokeWidth={1.6} aria-hidden /> Reads, never writes</h3>
                  <p>It can't change your site or your Google settings.</p>
                </div>
                <div>
                  <h3><UserCheck size={16} strokeWidth={1.6} aria-hidden /> A person approves every page</h3>
                  <p>Drafts wait in Content for your approval.</p>
                </div>
                <div>
                  <h3><Trash2 size={16} strokeWidth={1.6} aria-hidden /> Delete anything, any time</h3>
                  <p>Each kind of data has its own Delete button. Deleting your account revokes Google access.</p>
                </div>
                <div>
                  <h3><Ban size={16} strokeWidth={1.6} aria-hidden /> Never sold, never trained on</h3>
                  <p>Your data isn't sold or used to train AI.</p>
                </div>
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

            <PlanCards prices={prices} />
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
                {FAQ.map(([q, a, href]) => (
                  <details key={q}>
                    <summary>{q}</summary>
                    <p>
                      {a}
                      {href ? (
                        <>
                          {" "}
                          <Link href={href}>Learn more</Link>
                        </>
                      ) : null}
                    </p>
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
