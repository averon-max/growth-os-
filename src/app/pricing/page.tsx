import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";

export const metadata: Metadata = {
  title: "Pricing · Hyprlyx",
  description: "Simple monthly plans. Start free with one website and upgrade when you need more.",
  alternates: { canonical: "/pricing" },
};

const IDS = ["FREE", "STARTER", "GROWTH", "AUTOPILOT"] as const;
const DESC: Record<(typeof IDS)[number], string> = {
  FREE: "Try Hyprlyx on one website.",
  STARTER: "For one site getting serious about search.",
  GROWTH: "For growing sites and small teams.",
  AUTOPILOT: "For agencies and many sites.",
};
const HIGHLIGHTS: Record<(typeof IDS)[number], string[]> = {
  FREE: ["1 website", "Keyword research", "Basic site audit"],
  STARTER: ["Everything in Free", "Keyword Planner", "Full site audit", "Rankings from Search Console", "Monthly reports"],
  GROWTH: ["Everything in Starter", "5 websites", "Competitor monitoring", "Backlinks", "Audience & bot traffic", "Automations"],
  AUTOPILOT: ["Everything in Growth", "25 websites", "Advanced competitors", "Content workflows", "Priority processing"],
};

// ✓ = included, text = limit, false = not included. Keep in sync with lib/billing/access.ts.
type Cell = boolean | string;
const ROWS: { group: string; rows: [string, Cell, Cell, Cell, Cell][] }[] = [
  { group: "Usage", rows: [
    ["Websites", String(PLANS.FREE.limits.websites), String(PLANS.STARTER.limits.websites), String(PLANS.GROWTH.limits.websites), String(PLANS.AUTOPILOT.limits.websites)],
    ["Keyword data refreshes / month", String(PLANS.FREE.limits.keywordRefreshesPerMonth), String(PLANS.STARTER.limits.keywordRefreshesPerMonth), String(PLANS.GROWTH.limits.keywordRefreshesPerMonth), String(PLANS.AUTOPILOT.limits.keywordRefreshesPerMonth)],
    ["Content drafts / month", String(PLANS.FREE.limits.articlesPerMonth), String(PLANS.STARTER.limits.articlesPerMonth), String(PLANS.GROWTH.limits.articlesPerMonth), String(PLANS.AUTOPILOT.limits.articlesPerMonth)],
  ]},
  { group: "Research & planning", rows: [
    ["Keyword research & trends", true, true, true, true],
    ["Keyword Planner (quick wins, gaps, clusters)", false, true, true, true],
    ["Rankings from Search Console", false, true, true, true],
  ]},
  { group: "Site & competition", rows: [
    ["Site audit", "Basic", true, true, true],
    ["Fixes through your CMS", false, true, true, true],
    ["Competitor monitoring", false, false, true, "Advanced"],
    ["Backlinks", false, false, true, true],
    ["Audience & bot traffic (GA4, Cloudflare)", false, false, true, true],
  ]},
  { group: "Content & automation", rows: [
    ["Briefs & drafts", true, true, true, true],
    ["Automations", false, false, true, true],
    ["Content workflows", false, false, false, true],
  ]},
  { group: "Support", rows: [
    ["Email support", true, true, true, true],
    ["Priority processing & support", false, false, false, true],
  ]},
];

const FAQ = [
  ["Is there a free plan?", "Yes. Free covers one website with keyword research and a basic audit. No credit card required."],
  ["Can I change or cancel my plan anytime?", "Yes. Upgrades apply immediately and are prorated. Cancel from Settings → Billing and keep access until the end of the paid period."],
  ["Do you offer refunds?", "Plans are billed monthly in advance. If something went wrong, write to support@hyprlyx.com within 30 days and we'll make it right."],
  ["What payment methods do you accept?", "All major cards, Apple Pay and Google Pay through Stripe. We never see or store your card number."],
  ["Are taxes included?", "Prices are in USD and exclude tax. Applicable taxes are calculated at checkout."],
  ["Do I need Search Console or Google Analytics?", "No, but connecting them unlocks real rankings and traffic data. Both are free Google products."],
];

const cell = (v: Cell) =>
  v === true ? <Check size={16} className={s.yes} /> : v === false ? <Minus size={16} className={s.no} /> : <span>{v}</span>;

export default function PricingPage() {
  return (
    <SiteShell>
      <section className={s.hero} style={{ paddingBottom: 40 }}>
        <div className={s.container}>
          <p className={s.eyebrow}>Pricing</p>
          <h1 className={s.h1}>Simple plans that grow with you</h1>
          <p className={s.lede}>Start free with one website. Upgrade when you need more sites, data and automation. Cancel anytime.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 96 }}>
        <div className={s.container}>
          <div className={s.plans}>
            {IDS.map((id) => {
              const plan = PLANS[id];
              const popular = id === "GROWTH";
              return (
                <div key={id} className={popular ? `${s.plan} ${s.planPopular}` : s.plan}>
                  <div className={s.planHead}>
                    <h2 className={s.planName}>{plan.name}</h2>
                    {popular ? <span className={s.planTag}>Most popular</span> : null}
                  </div>
                  <p className={s.price}>${plan.priceMonthlyUsd}<span className={s.per}>/ month</span></p>
                  <p className={s.planDesc}>{DESC[id]}</p>
                  <ul className={s.planList}>
                    {HIGHLIGHTS[id].map((h) => <li key={h}><Check size={15} strokeWidth={2.2} />{h}</li>)}
                  </ul>
                  {id === "FREE" ? (
                    <Link href="/signup" className={s.ghost} style={{ justifyContent: "center" }}>Start free</Link>
                  ) : (
                    <SubscribeButton plan={id} label={`Choose ${plan.name}`} variant={popular ? "accent" : "light"} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}><h2 className={s.h2}>Compare plans</h2><p className={s.muted}>Everything in each plan, side by side.</p></div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead><tr><th>Feature</th>{IDS.map((id) => <th key={id}>{PLANS[id].name}</th>)}</tr></thead>
              <tbody>
                {ROWS.map((g) => [
                  <tr key={g.group} className={s.group}><td colSpan={5}>{g.group}</td></tr>,
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
        <div className={s.narrow}>
          <h2 className={s.h2} style={{ marginBottom: 28 }}>Billing questions</h2>
          <div className={s.faq}>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
          <p className={s.muted} style={{ marginTop: 28, fontSize: 14 }}>
            Still have a question? <Link href="/support" style={{ color: "#f7f8f8" }}>Contact support</Link>.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
