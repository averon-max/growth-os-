import type { Metadata } from "next";
import { Geist_Mono, Inter, Newsreader } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Menu } from "lucide-react";

import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";

import styles from "./landing.module.css";

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
    number: "1.0",
    label: "Keyword research",
    title: "Know what people search for",
    text: "Volume, difficulty, CPC and trend for every keyword, plus rising searches from Google Trends — before you decide what to write.",
    src: "/landing/keywords-v9.webp",
    alt: "Keyword research: rising and top searches with volume, difficulty and CPC",
  },
  {
    id: "visibility",
    number: "2.0",
    label: "Rankings",
    title: "See where you stand",
    text: "Impressions, clicks and positions straight from Search Console, with the queries closest to page one surfaced first.",
    src: "/landing/search-console-v9.webp",
    alt: "Search Console view with impressions, average position and easiest wins",
  },
  {
    id: "writer",
    number: "3.0",
    label: "AI writer",
    title: "Write what actually ranks",
    text: "Drafts built from the live search results: competitor structure, People Also Ask and sources you can verify before anything goes live.",
    src: "/landing/content-v9.webp",
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

const FOOTER = [
  {
    title: "Product",
    links: [
      { label: "Keyword research", href: "#keywords" },
      { label: "Rankings", href: "#visibility" },
      { label: "AI writer", href: "#writer" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign up", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Reset password", href: "/forgot-password" },
    ],
  },
];

function BrandMark() {
  return (
    <svg className={styles.brandMark} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#f7f8f8" />
      <path d="M7 17L12 7L17 17" stroke="#08090a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.4 13.2H14.6" stroke="#08090a" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className={`${styles.page} ${display.variable} ${mono.variable}`}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            <BrandMark />
            Hyprlyx
          </Link>

          <nav className={styles.navRight} aria-label="Main">
            <div className={styles.navAnchors}>
              <a href="#keywords">Product</a>
              <a href="#pricing">Pricing</a>
            </div>
            <Link href="/login" className={styles.navLogin}>Log in</Link>
            <Link href="/signup" className={styles.pill}>Sign up</Link>
            <details className={styles.menu}>
              <summary aria-label="Open menu">
                <Menu size={24} strokeWidth={1.6} />
              </summary>
              <div className={styles.menuPanel}>
                <a href="#keywords">Product</a>
                <a href="#pricing">Pricing</a>
                <Link href="/login">Log in</Link>
                <Link href="/signup">Sign up</Link>
              </div>
            </details>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.container}>
            <Link href="/signup" className={styles.news}>
              <span className={styles.newsTag}>New</span>
              <span className={styles.newsText}>
                AI article writer <ArrowRight size={15} />
              </span>
            </Link>

            <h1 className={styles.heroTitle}>Plan, write and rank in one workspace</h1>

            <p className={styles.heroLede}>
              Hyprlyx brings keyword research, Search Console, AI-written articles and backlinks
              together, so your team knows what to publish next and why.
            </p>

            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.pill}>Start free</Link>
              <a href="#pricing" className={styles.textLink}>
                See pricing <ArrowRight size={15} />
              </a>
            </div>
          </div>

          <div className={styles.heroStage}>
          <div className={styles.heroShotWrap}>
            <div className={styles.heroShot}>
              <Image
                src="/landing/planner-v9.webp"
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
                    <span className={styles.eyebrowNum}>{section.number}</span> {section.label}
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
                  <span className={styles.eyebrowNum}>4.0</span> Pricing
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
              <a href="#pricing" className={styles.textLink}>
                See pricing <ArrowRight size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.brand}>
                <BrandMark />
                Hyprlyx
              </Link>
              <p>The SEO workspace for teams that publish.</p>
            </div>

            {FOOTER.map((column) => (
              <nav key={column.title} className={styles.footerCol} aria-label={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("#") ? (
                        <a href={link.href}>{link.label}</a>
                      ) : (
                        <Link href={link.href}>{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Hyprlyx</span>
            <span>hyprlyx.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
