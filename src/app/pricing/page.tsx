import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import SubscribeButton from "@/components/subscribe-button";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { planPrices, formatPrice } from "@/lib/billing/prices";
import { FEATURES, PLAN_ORDER, hasFeature, highlights } from "@/lib/billing/features";
import { NAV } from "@/lib/nav";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Pricing · Hyprlyx",
  description: "Simple monthly plans. Start free with one website and upgrade when you need keyword data, content and more sites.",
  alternates: { canonical: "/pricing" },
};

const DESC: Record<PlanId, string> = {
  FREE: "One website and the overview. Free, no card needed.",
  STARTER: "Keyword data, site audits and publishing for one site.",
  GROWTH: "Content, backlinks, competitors and traffic for up to 5 sites.",
  AUTOPILOT: "Everything, with room for agencies and many sites.",
};

type Cell = boolean | string;
const yes = (id: PlanId, key: string): Cell => hasFeature(id, key);

const n = (v: number) => v.toLocaleString("en-US");
const ROWS: { group: string; rows: [string, ...Cell[]][] }[] = [
  {
    group: "Usage",
    rows: [
      ["Websites", ...PLAN_ORDER.map((id) => n(PLANS[id].limits.websites))],
      ["Keyword data refreshes / month", ...PLAN_ORDER.map((id) => (hasFeature(id, "keywords") ? n(PLANS[id].limits.keywordRefreshesPerMonth) : false))],
      ["AI article drafts / month", ...PLAN_ORDER.map((id) => (hasFeature(id, "content") ? n(PLANS[id].limits.articlesPerMonth) : false))],
    ],
  },
  ...NAV.map((section) => ({
    group: section.label,
    rows: section.items.map((item) => {
      const f = FEATURES.find((x) => x.label === item.label)!;
      return [f.description ? `${f.label} — ${f.description.toLowerCase()}` : f.label, ...PLAN_ORDER.map((id) => yes(id, f.key))] as [string, ...Cell[]];
    }),
  })),
  { group: "Support", rows: [["Email support", true, true, true, true]] },
];

const FAQ = [
  ["Is there a free plan?", "Yes. Free covers one website and the overview dashboard. Keyword data, audits and AI content start with Starter. No credit card required."],
  ["Can I change or cancel my plan anytime?", "Yes. Upgrades apply immediately and the difference is prorated. Cancel from Settings → Billing and keep access until the end of the paid period."],
  ["Do you offer refunds?", "Plans are billed monthly in advance. If something went wrong, write to support@hyprlyx.com within 30 days and we'll make it right."],
  ["What payment methods do you accept?", "All major cards, Apple Pay and Google Pay through Stripe. We never see or store your card number."],
  ["Are taxes included?", "Prices are in USD and exclude tax. Applicable taxes are calculated at checkout."],
  ["Do I need Search Console or Google Analytics?", "No, but connecting them unlocks real rankings and traffic data. Both are free Google products."],
];

const cell = (v: Cell) =>
  v === true ? <Check size={16} className={s.yes} /> : v === false ? <Minus size={16} className={s.no} /> : <span>{v}</span>;

export default async function PricingPage() {
  const prices = await planPrices();
  return (
    <SiteShell>
      <section className={s.hero} style={{ paddingBottom: 40 }}>
        <div className={s.container}>
          <p className={s.eyebrow}>Pricing</p>
          <h1 className={s.h1}>Simple plans that grow with you</h1>
          <p className={s.lede}>Start free with one website. Upgrade when you need keyword data, content and more sites. Cancel anytime.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 96 }}>
        <div className={s.container}>
          <div className={s.plans}>
            {PLAN_ORDER.map((id) => {
              const plan = PLANS[id];
              const popular = id === "GROWTH";
              return (
                <div key={id} className={popular ? `${s.plan} ${s.planPopular}` : s.plan}>
                  <div className={s.planHead}>
                    <h2 className={s.planName}>{plan.name}</h2>
                    {popular ? <span className={s.planTag}>Most popular</span> : null}
                  </div>
                  <p className={s.price}>{formatPrice(prices[id])}<span className={s.per}>/ month</span></p>
                  <p className={s.planDesc}>{DESC[id]}</p>
                  <ul className={s.planList}>
                    {highlights(id).map((h) => <li key={h}><Check size={15} strokeWidth={2.2} />{h}</li>)}
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
              <thead><tr><th>Feature</th>{PLAN_ORDER.map((id) => <th key={id}>{PLANS[id].name}</th>)}</tr></thead>
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
