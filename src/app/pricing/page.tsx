import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import SubscribeButton from "@/components/subscribe-button";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { planPrices, formatPrice } from "@/lib/billing/prices";
import { FEATURES, PAID_ORDER, hasFeature, highlights } from "@/lib/billing/features";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/billing/trial";
import { NAV } from "@/lib/nav";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";
import { FEATURES as TOOLS } from "@/components/site/features";
import { pageMeta, breadcrumbs, ORGANIZATION } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const prices = await planPrices();
  return pageMeta(
    `Pricing: SEO Tool Plans from ${formatPrice(prices.STARTER)}/month | Hyprlyx`,
    `Hyprlyx pricing: Starter, Growth and Autopilot SEO plans with keyword research, rank tracking, audits and an AI writer. Starter is free for ${TRIAL_DAYS} days. Cancel anytime.`,
    "/pricing",
  );
}

const DESC: Record<PlanId, string> = {
  FREE: "",
  STARTER: "Everything you need to grow one website, except the AI writer.",
  GROWTH: "Adds the AI writer, with room for up to 5 websites.",
  AUTOPILOT: "Everything, for agencies and teams running many sites.",
};

type Cell = boolean | string;
const n = (v: number) => v.toLocaleString("en-US");
const ROWS: { group: string; rows: [string, ...Cell[]][] }[] = [
  {
    group: "Usage",
    rows: [
      ["Websites", ...PAID_ORDER.map((id) => n(PLANS[id].limits.websites))],
      ["Tracked keywords", ...PAID_ORDER.map((id) => (hasFeature(id, "keywords") ? n(PLANS[id].limits.trackedKeywords) : false))],
      ["AI article drafts / month", ...PAID_ORDER.map((id) => (hasFeature(id, "content") ? n(PLANS[id].limits.articlesPerMonth) : false))],
    ],
  },
  ...NAV.map((section) => ({
    group: section.label,
    rows: section.items.map((item) => {
      const f = FEATURES.find((x) => x.label === item.label)!;
      return [f.text, ...PAID_ORDER.map((id) => (f.soon ? (hasFeature(id, f.key) ? "Soon" : false) : hasFeature(id, f.key)))] as [string, ...Cell[]];
    }),
  })),
  { group: "Billing & support", rows: [["Free trial", `${TRIAL_DAYS} days`, false, false], ["Cancel anytime in Settings", true, true, true], ["Email support", true, true, true]] },
];

const FAQ = [
  ["How does the free trial work?", `Starter is free for ${TRIAL_DAYS} days. You add a card at checkout and nothing is charged during the trial. When it ends, the Starter monthly price is charged and the plan renews every month. Cancel before the trial ends in Settings → Billing and you pay nothing. One trial per workspace.`],
  ["Can I change or cancel my plan anytime?", "Yes. Upgrades apply immediately and you pay only the difference for the rest of the month; downgrades credit the difference to your next invoices. Cancel in Settings → Billing and keep access until the end of the period you paid for."],
  ["Can I use Hyprlyx without paying?", "Yes. A free account includes one website and the overview. Keyword data, audits, backlinks and the AI writer start with Starter."],
  ["Do you offer refunds?", "Plans are billed monthly in advance. If something went wrong, write to support@hyprlyx.com within 30 days and we'll look into it."],
  ["What payment methods do you accept?", "All major cards, Apple Pay and Google Pay through Stripe. We never see or store your card number, and you can remove your card in Settings → Billing."],
  ["Are taxes included?", "Prices are in US dollars. If sales tax applies to you, it is shown at checkout before you pay."],
  ["Do I need Search Console or Google Analytics?", "No, but connecting them unlocks real rankings and traffic data. Both are free Google products."],
];

const cell = (v: Cell) =>
  v === true ? <Check size={16} className={s.yes} /> : v === false ? <Minus size={16} className={s.no} /> : <span>{v}</span>;

export default async function PricingPage() {
  const prices = await planPrices();
  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Hyprlyx",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: ORGANIZATION,
      offers: PAID_ORDER.map((id) => ({ "@type": "Offer", name: PLANS[id].name, price: prices[id], priceCurrency: "USD", url: `${SITE_URL}/pricing` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    breadcrumbs([{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]),
  ];
  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <section className={s.hero}>
        <div className={s.container}>
          <p className={s.eyebrow}>Pricing</p>
          <h1 className={s.h1}>
            Simple plans.
            <br />
            Starter free for {TRIAL_DAYS} days.
          </h1>
          <div className={s.heroRow}>
            <p className={s.lede}>Monthly plans with no contract. Cancel anytime in Settings and keep access until the end of the period you paid for.</p>
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 72 }}>
        <div className={s.container}>
          <div className={s.plans}>
            {PAID_ORDER.map((id) => {
              const plan = PLANS[id];
              const featured = id === "GROWTH";
              const trial = id === TRIAL_PLAN;
              return (
                <div key={id} className={featured ? `${s.plan} ${s.planPopular}` : s.plan}>
                  <div className={s.planHead}>
                    <h2 className={s.planName}>{plan.name}</h2>
                    {trial ? <span className={s.planTag}>{TRIAL_DAYS} days free</span> : featured ? <span className={s.planTag}>Most popular</span> : null}
                  </div>
                  <p className={s.price}>{formatPrice(prices[id])}<span className={s.per}>/ month</span></p>
                  <p className={s.planDesc}>{DESC[id]}</p>
                  <ul className={s.planList}>
                    {highlights(id).map((h) => <li key={h}><Check size={15} strokeWidth={2.2} />{h}</li>)}
                  </ul>
                  <SubscribeButton plan={id as "STARTER" | "GROWTH" | "AUTOPILOT"} label={trial ? `Start ${TRIAL_DAYS}-day free trial` : `Choose ${plan.name}`} variant={featured ? "accent" : "light"} />
                  <p className={s.small} style={{ margin: "12px 0 0", fontSize: 12.5, textAlign: "center" }}>
                    {trial ? `Free for ${TRIAL_DAYS} days, then ${formatPrice(prices[id])}/month. Cancel before day ${TRIAL_DAYS} and pay nothing.` : "Billed monthly. Cancel anytime."}
                  </p>
                </div>
              );
            })}
          </div>
          <p className={s.small} style={{ marginTop: 28, textAlign: "center" }}>
            Just looking? <Link href="/signup" style={{ color: "#ededed" }}>Create a free account</Link> with one website and the overview — no card needed.
          </p>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}><h2 className={s.h2}>Compare plans</h2><p className={s.muted}>Everything in each plan, side by side.</p></div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Feature</th>{PAID_ORDER.map((id) => <th key={id}>{PLANS[id].name}</th>)}</tr></thead>
              <tbody>
                {ROWS.map((g) => [
                  <tr key={g.group} className={s.group}><td colSpan={PAID_ORDER.length + 1}>{g.group}</td></tr>,
                  ...g.rows.map(([label, ...vals]) => (
                    <tr key={label}><td>{label}</td>{vals.map((v, i) => <td key={i}>{cell(v)}</td>)}</tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.faqWrap}>
          <h2 className={s.h2}>Billing questions</h2>
          <div>
          <div className={s.faq}>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
          <p className={s.small} style={{ marginTop: 28 }}>
            Still have a question? <Link href="/support" style={{ color: "#ededed" }}>Contact support</Link>. See also our{" "}
            <Link href="/terms" style={{ color: "#ededed" }}>Terms</Link>.
          </p>
          </div>
          </div>
        </div>
      </section>
      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>Every tool, in every plan</h2>
            <p className={s.muted}>One workspace for keyword research, rank tracking, technical SEO, competitors, backlinks, content and traffic.</p>
          </div>
          <div className={s.grid4}>
            {TOOLS.map((f) => (
              <Link key={f.slug} href={`/product/${f.slug}`} className={s.cell}>
                <h3>{f.name}</h3>
                <p>{f.short}.</p>
                <span className={s.cellMore}>{f.seoTitle.split(" | ")[0].split(":")[0]}</span>
              </Link>
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
