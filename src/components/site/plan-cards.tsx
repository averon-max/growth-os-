import { Check } from "lucide-react";
import SubscribeButton from "@/components/subscribe-button";
import { PLANS } from "@/lib/billing/plans";
import { formatPrice } from "@/lib/billing/prices";
import { TRIAL_DAYS, TRIAL_PLAN } from "@/lib/billing/trial";
import { siteStyles as s } from "@/components/site/site-shell";

/*
 * The three paid plans as full cards, the way SEO tools present them: who the plan is for, the price, one button,
 * then everything inside the plan in short groups. Each card stands on its own, so none of them looks empty.
 */
type Paid = "STARTER" | "GROWTH" | "AUTOPILOT";
const n = (v: number) => v.toLocaleString("en-US");
const L = (id: Paid) => PLANS[id].limits;

const COPY: Record<Paid, { who: string; groups: [string, string[]][] }> = {
  STARTER: {
    who: "For one website that wants to grow in Google: every SEO tool except the AI writer.",
    groups: [
      ["Your plan", [`${n(L("STARTER").websites)} website`, `${n(L("STARTER").trackedKeywords)} tracked keywords`, "Rankings from Search Console, every day"]],
      ["Keywords", ["Keyword Planner: quick wins, gaps and clusters", "Keyword research with Google Trends", "Cannibalization: pages that compete"]],
      ["Site and market", ["Technical SEO audit with written fixes", "Backlinks: referring domains, anchors, spam score", "Competitor tracking and keyword gaps"]],
      ["Traffic", ["Traffic report: Cloudflare visits and Google clicks", "Audience from Google Analytics 4", "Search engine and AI crawler traffic"]],
    ],
  },
  GROWTH: {
    who: "For teams that publish every week: the AI writer on top of every Starter tool.",
    groups: [
      ["Your plan", [`${n(L("GROWTH").websites)} websites`, `${n(L("GROWTH").trackedKeywords)} tracked keywords`, `${n(L("GROWTH").articlesPerMonth)} AI article drafts a month`]],
      ["AI writer", ["Briefs built from live Google results", "Full drafts written from the brief", "Sources from the results, cited in each draft", "Nothing goes live without your approval"]],
      ["Also included", ["Every Starter tool for each website", "Keyword Planner, research and rank tracking", "SEO audit, backlinks and competitors", "Traffic, audience and AI crawlers", "Published pages show up in rankings and traffic"]],
    ],
  },
  AUTOPILOT: {
    who: "For agencies and teams running many sites from one workspace.",
    groups: [
      ["Your plan", [`${n(L("AUTOPILOT").websites)} websites`, `${n(L("AUTOPILOT").trackedKeywords)} tracked keywords`, `${n(L("AUTOPILOT").articlesPerMonth)} AI article drafts a month`]],
      ["For many sites", ["One workspace for every site you run", "Each site keeps its own keywords, audits and reports", "Switch between sites from the top bar"]],
      ["Also included", ["Everything in Growth", "AI writer: briefs, drafts and cited sources", "Keyword Planner, audit, backlinks and competitors", "Traffic, audience and AI crawlers for every site"]],
    ],
  },
};

export function PlanCards({ prices }: { prices: Record<string, number> }) {
  const order: Paid[] = ["STARTER", "GROWTH", "AUTOPILOT"];
  return (
    <div className={s.plans}>
      {order.map((id) => {
        const plan = PLANS[id];
        const featured = id === "GROWTH";
        const trial = id === TRIAL_PLAN;
        return (
          <div key={id} className={featured ? `${s.plan} ${s.planPopular}` : s.plan}>
            <div className={s.planHead}>
              <h3 className={s.planName}>{plan.name}</h3>
              {trial ? <span className={s.planTag}>{TRIAL_DAYS} days free</span> : featured ? <span className={s.planTag}>Recommended</span> : null}
            </div>
            <p className={s.planWho}>{COPY[id].who}</p>
            <p className={s.price}>
              {formatPrice(prices[id])}
              <span className={s.per}>/ month</span>
            </p>
            <div className={s.planCta}>
              <SubscribeButton plan={id} label={trial ? `Start ${TRIAL_DAYS}-day free trial` : `Choose ${plan.name}`} variant={featured ? "light" : "outline"} />
            </div>
            <p className={s.planNote}>{trial ? `Free for ${TRIAL_DAYS} days, then ${formatPrice(prices[id])} a month.` : "Billed monthly. Cancel anytime."}</p>
            {COPY[id].groups.map(([title, items]) => (
              <div key={title} className={s.planGroup}>
                <h4>{title}</h4>
                <ul className={s.planList}>
                  {items.map((item) => (
                    <li key={item}>
                      <Check size={15} strokeWidth={2.2} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
