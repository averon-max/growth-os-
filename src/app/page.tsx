import type { Metadata } from "next";
import { display, mono } from "./fonts";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Ban, Check, CircleCheck, Eye, Trash2, UserCheck } from "lucide-react";

import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";
import { planPrices, formatPrice } from "@/lib/billing/prices";
import { highlights, usage } from "@/lib/billing/features";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/billing/trial";

import styles from "./landing.module.css";
import { LatestPosts } from "@/components/blog/latest-posts";
import { SiteHeader, SiteFooter, siteStyles as s } from "@/components/site/site-shell";
import { INTEGRATIONS } from "@/components/site/features";
import { StepArt, type StepArtKind } from "@/components/site/step-art";
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
    shots: [{ src: "/landing/search-console-v19.webp", alt: "Keywords: queries, impressions, clicks and average position from Search Console, the visibility chart and the easiest wins", w: 3360, h: 2100 }],
    caption: ["Every query, every day", "Queries, impressions, clicks and average position from Search Console, with the daily visibility chart and the queries that are rising or closest to page one."],
    cards: [
      { src: "/landing/real-rank-kpis.webp", alt: "Queries and impressions with the split of positions into top 3, 4–10, 11–20 and beyond", title: "Where every query stands", text: "Each query falls into the top 3, positions 4 to 10, 11 to 20 or beyond, and the bar shows how your whole site is spread. Pick a number to chart it for 7, 28 or 90 days." },
      { src: "/landing/real-overview-search.webp", alt: "Google Search on the overview: clicks, impressions and average position with their change", title: "Search on the first screen", text: "The overview keeps clicks, impressions and average position for 7, 14 or 28 days, each with its change and a small trend, so you know how search is going before you open a report." },
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
    shots: [{ src: "/landing/planner-v11.webp", alt: "Keyword Planner with volume, difficulty, intent, positions and the page that ranks", w: 2048, h: 1110 }],
    caption: ["One list for every keyword", "Volume, difficulty, intent, your position and the page that ranks, side by side. Track any keyword in one click and follow it in Keywords."],
    cards: [
      { src: "/landing/real-planner-keywords.webp", alt: "Planner keywords on the overview with volume and position", title: "Your keywords next to your traffic", text: "The keywords you plan for sit on the overview with their monthly volume and current position, so a plan and its results are on one screen." },
      { src: "/landing/real-keyword-detail.webp", alt: "Keyword detail: monthly volume, difficulty, cost per click and ad competition", title: "Every number behind a keyword", text: "Open any keyword for its monthly volume, difficulty, cost per click and ad competition, and see in seconds whether it is worth a page." },
    ],
    features: [
      { label: "Keyword Planner", href: "/product/planner" },
      { label: "Keyword research", href: "/product/keywords" },
      { label: "Google Trends", href: "/product/keywords" },
    ],
  },
  {
    id: "content",
    title: ["Write when the", "data says so"],
    text: "When a gap needs a page, Hyprlyx builds a brief from the pages that rank for it today: the headings they share, the questions people ask, the facts they cite. Ask for a draft and it is written from that brief, in your site's voice.",
    href: "/product/content",
    link: "AI writer",
    shots: [{ src: "/landing/content-v22.webp", alt: "Content library with drafts, approved and published articles, their format, intent and length", w: 3360, h: 2100 }],
    caption: ["Every article in one place", "Drafts, approved and published articles with their format, intent and length. Nothing moves to Published until someone on your team approves it."],
    cards: [
      { src: "/landing/real-content-pipeline.webp", alt: "Articles, drafts and approved counts with filters by status", title: "From draft to live", text: "How many articles you have, how many wait for review and how many are ready, with one filter per status. The library reads like a pipeline, not a folder." },
      { src: "/landing/real-content-rows.webp", alt: "Article rows with format, intent, word count and Approve or Publish", title: "Format, intent and length on every row", text: "Each article shows its format, search intent and word count, with Approve and Publish right on the row, so a review takes one pass." },
    ],
    features: [
      { label: "Briefs", href: "/product/content" },
      { label: "AI drafts", href: "/product/content" },
      { label: "Approval", href: "/product/content" },
    ],
  },
  {
    id: "traffic",
    title: ["Traffic you", "can trust"],
    text: "Cloudflare counts every visit at the edge, including people who block analytics scripts, and Search Console counts what Google sends. Hyprlyx puts the two side by side, day by day, with the pages and countries behind every change.",
    href: "/product/traffic",
    link: "Traffic report",
    shots: [{ src: "/landing/traffic-v20.webp", alt: "Traffic report: visits by country and top pages, day by day", w: 2048, h: 1110 }],
    caption: ["One report, two sources", "Switch between Cloudflare visits and Google clicks without leaving the page. The overview, the map and every report read the same numbers."],
    cards: [
      { src: "/landing/real-countries.webp", alt: "Visits by country, day by day, with each country's share", title: "Visits by country, day by day", text: "Each day's visits split by country, with every country's share of the period next to it. A spike from one market shows up the day it happens." },
      { src: "/landing/real-cloudflare.webp", alt: "Cloudflare visitors and verified bots with their change", title: "People and bots, apart", text: "Visitors from Cloudflare for 7, 14 or 28 days, and the share of requests that came from verified bots, each with its change against the period before." },
    ],
    features: [
      { label: "Traffic report", href: "/product/traffic" },
      { label: "Countries map", href: "/product/traffic" },
      { label: "AI crawlers", href: "/product/traffic" },
    ],
  },
  {
    id: "competitors",
    title: ["Know who", "you're up against"],
    text: "Add the sites you compete with and Hyprlyx compares them with yours: their referring domains, keywords and traffic, the keywords you share, the gaps they hold over you, and every link that points at your own site, scored for spam.",
    href: "/product/competitors",
    link: "Competitor analysis",
    shots: [
      { src: "/landing/competitors-v22.webp", alt: "Competitors: referring domains, keywords, traffic, shared keywords and gaps for each tracked site", w: 1585, h: 930 },
      { src: "/landing/backlinks-v20.webp", alt: "Backlinks: link quality by spam score, link types, anchors and new linking domains", w: 1586, h: 860 },
    ],
    caption: ["Their numbers next to yours", "Each competitor with referring domains, keywords, traffic, top-10 rankings and gaps, and your own links sorted into clean, watch and spam."],
    features: [
      { label: "Competitors", href: "/product/competitors" },
      { label: "Backlinks", href: "/product/backlinks" },
      { label: "Keyword gaps", href: "/product/competitors" },
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

const FAQ: [string, string, string?][] = [
  ["What is Hyprlyx?", "An SEO workspace that brings keyword research, Search Console, traffic, competitors, backlinks and AI-written drafts together, so you can see where you stand and decide what to publish next.", "/product"],
  ["Who is it for?", "Founders and marketers growing one site, content teams publishing every week, and agencies running many sites from one workspace.", "/product"],
  ["Where does the data come from?", "Google Search Console for impressions, clicks and positions; Google Analytics 4 and Cloudflare for visits, countries and crawlers; DataForSEO for keyword, SERP, competitor and backlink data; Google Trends for rising searches.", "/product/rankings"],
  ["Do I need Search Console or Google Analytics?", "No, but connecting them unlocks your real rankings and traffic. Both are free Google products, and Hyprlyx only reads from them."],
  ["How does the free trial work?", `Starter is free for ${TRIAL_DAYS} days. You add a card at checkout and nothing is charged during the trial. Cancel before it ends in Settings → Billing and you pay nothing.`, "/pricing"],
  ["Does the AI publish to my site?", "No. The writer prepares briefs and drafts; a person reviews and approves every page. Direct publishing to WordPress and other CMSs is coming soon.", "/product/content"],
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
              <Image src="/landing/overview-v20.webp" alt="Hyprlyx overview: website, Google Search clicks and positions, SEO score, Cloudflare traffic, tracked keywords, visits by country and top pages" width={3360} height={2100} priority quality={90} sizes="(max-width: 1320px) 100vw, 1320px" />
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
                    <div key={shot.src} className={styles.frameShot}>
                      <Image src={shot.src} alt={shot.alt} width={shot.w} height={shot.h} quality={90} sizes="(max-width: 1200px) 100vw, 1120px" />
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
                      <Image src={c.src} alt={c.alt} width={1120} height={640} quality={90} sizes="(max-width: 900px) 100vw, 560px" />
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
                      {highlights(id).filter((item) => !usage(id).includes(item)).map((item) => (
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
