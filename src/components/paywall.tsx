import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  CircleCheck,
  Compass,
  FileSearch,
  FileText,
  Globe,
  Layers,
  Link2,
  ListChecks,
  MapPin,
  MousePointerClick,
  PenLine,
  Plug,
  RefreshCw,
  ScanSearch,
  Search,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Upload,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import SubscribeButton from "@/components/subscribe-button";
import { FEATURES, usage } from "@/lib/billing/features";
import { type PlanId } from "@/lib/billing/plans";

import styles from "./paywall.module.css";

/*
 * A section the plan doesn't include, shown like Vercel's upgrade dialogs: the page's outline stays faintly
 * in the background, and one card in front says what the section does, shows a few example rows in the same
 * list style as the real page, lists four things it adds with plain line icons, and offers the plan.
 * One accent only: the plan pill. Example rows are illustrations (example domains), never the user's data.
 */

type State = "done" | "half" | "open" | "bad";
type Row = { id: string; state: State; title: string; hint?: string; side: string };
type Pitch = { title: string; text: string; rows: Row[]; features: [LucideIcon, string, string][] };

const PITCH: Record<string, Pitch> = {
  Keywords: {
    title: "Track every keyword you rank for",
    text: "Positions, clicks and impressions from Search Console for each query, with volume and difficulty next to them.",
    rows: [
      { id: "KW-12", state: "done", title: "project management software", hint: "#3", side: "12.1K / mo" },
      { id: "KW-27", state: "half", title: "best crm for small business", hint: "#11", side: "8.1K / mo" },
      { id: "KW-31", state: "open", title: "crm pricing comparison", hint: "not ranking", side: "2.9K / mo" },
    ],
    features: [
      [TrendingUp, "Daily positions", "Every query from Search Console, checked each day."],
      [Target, "Quick wins", "Pages in positions 4–20 that a small push lifts to page one."],
      [BarChart3, "Volume and difficulty", "Search volume, CPC and difficulty for each keyword."],
      [Activity, "What moved", "Which queries went up or down this week."],
    ],
  },
  "Keyword planner": {
    title: "Know what to write next",
    text: "The planner reads your site and Google, then lists the keywords you can win, grouped into topics.",
    rows: [
      { id: "KP-04", state: "half", title: "best crm for small business", hint: "quick win", side: "8.1K / mo" },
      { id: "KP-09", state: "open", title: "crm vs spreadsheet", hint: "gap", side: "1.3K / mo" },
      { id: "KP-15", state: "open", title: "crm pricing", hint: "topic: CRM", side: "4.4K / mo" },
    ],
    features: [
      [Zap, "Quick wins", "Keywords where you already rank 4–20."],
      [Search, "Content gaps", "Queries competitors rank for and you don't."],
      [Layers, "Topics", "Related keywords grouped into one page each."],
      [Compass, "Search intent", "What the searcher wants, so the page fits it."],
    ],
  },
  Content: {
    title: "Write from live Google results",
    text: "Briefs and full drafts built from the pages that already rank. Every article waits for your approval.",
    rows: [
      { id: "ART-31", state: "open", title: "How to choose a CRM for a small team", side: "Draft" },
      { id: "ART-30", state: "half", title: "CRM vs spreadsheet: when to switch", side: "In review" },
      { id: "ART-28", state: "done", title: "12 CRM features worth paying for", side: "Published" },
    ],
    features: [
      [FileText, "Briefs from real results", "Headings, questions and facts from the pages that rank."],
      [PenLine, "Full drafts", "Written in your site's voice, with sources you can check."],
      [CircleCheck, "Approval first", "Nothing goes live until someone approves it."],
      [Send, "Publish in one click", "Approved articles go to your connected site."],
    ],
  },
  Competitors: {
    title: "See who outranks you, and where",
    text: "Track up to 25 competitors: their keywords, the gaps you can close and the places you already win.",
    rows: [
      { id: "CO-01", state: "bad", title: "pipeline.example", hint: "312 gaps", side: "4,120 keywords" },
      { id: "CO-02", state: "half", title: "crmhub.example", hint: "198 gaps", side: "2,870 keywords" },
      { id: "CO-03", state: "done", title: "salesdesk.example", hint: "you lead", side: "1,940 keywords" },
    ],
    features: [
      [Users, "Up to 25 competitors", "Any site that competes with you in Google."],
      [Search, "Keyword gaps", "Their top-10 keywords you don't rank for."],
      [TrendingUp, "Wins and losses", "Where you beat them, and where they beat you."],
      [Link2, "Referring domains", "How many sites link to each of them."],
    ],
  },
  Backlinks: {
    title: "Know every site that links to you",
    text: "Referring domains, links and anchors for your site, with new and lost links as they happen.",
    rows: [
      { id: "BL-07", state: "done", title: "news.example", hint: "dofollow", side: "3 links" },
      { id: "BL-11", state: "done", title: "guide.example", hint: "dofollow", side: "1 link" },
      { id: "BL-14", state: "open", title: "forum.example", hint: "lost", side: "2 links" },
    ],
    features: [
      [Globe, "Referring domains", "Every site that links to you, with its strength."],
      [Link2, "New and lost links", "What appeared and what disappeared."],
      [FileSearch, "Anchors and pages", "Which words link to which of your pages."],
      [Upload, "Import files", "Add links from Search Console, Ahrefs or Bing as CSV."],
    ],
  },
  "Traffic report": {
    title: "Clicks and visits on one screen",
    text: "Google clicks and Cloudflare visits side by side, with the pages and countries behind every change.",
    rows: [
      { id: "/blog", state: "done", title: "/blog/crm-guide", hint: "+18%", side: "1,240 clicks" },
      { id: "/", state: "done", title: "/pricing", hint: "+4%", side: "860 clicks" },
      { id: "/vs", state: "bad", title: "/compare/crm-vs-sheets", hint: "−6%", side: "410 clicks" },
    ],
    features: [
      [MousePointerClick, "Google clicks", "Clicks, impressions, CTR and position."],
      [Activity, "Real visits", "Every visit from Cloudflare, with bots kept apart."],
      [MapPin, "Countries and pages", "Where people come from and where they land."],
      [TrendingUp, "What changed", "The pages that moved most this week."],
    ],
  },
  Bots: {
    title: "See which crawlers read your site",
    text: "Search engine and AI crawlers from your Cloudflare traffic, verified and counted day by day.",
    rows: [
      { id: "BOT-1", state: "done", title: "Googlebot", hint: "verified", side: "18,420 requests" },
      { id: "BOT-2", state: "done", title: "GPTBot", hint: "verified", side: "2,310 requests" },
      { id: "BOT-3", state: "open", title: "Unknown crawler", hint: "not verified", side: "940 requests" },
    ],
    features: [
      [Bot, "AI crawlers", "GPTBot, ClaudeBot, PerplexityBot and more."],
      [ShieldCheck, "Verified only", "Real search engine bots, separated from fakes."],
      [FileSearch, "Pages they read", "Which pages each crawler requests most."],
      [Activity, "Over time", "Crawl activity day by day."],
    ],
  },
  Audience: {
    title: "Know who visits",
    text: "Visitors, countries and pages from Google Analytics 4 and Cloudflare, in one place.",
    rows: [
      { id: "US", state: "done", title: "United States", hint: "42%", side: "8,240 visitors" },
      { id: "GB", state: "done", title: "United Kingdom", hint: "11%", side: "2,160 visitors" },
      { id: "DE", state: "half", title: "Germany", hint: "7%", side: "1,380 visitors" },
    ],
    features: [
      [Users, "Visitors", "Daily visitors from Analytics and Cloudflare."],
      [MapPin, "Countries", "Where your visitors are, on a map."],
      [FileSearch, "Search queries", "What people searched before they arrived."],
      [Activity, "Trends", "How each audience changes over time."],
    ],
  },
  Seo: {
    title: "Find what holds your pages back",
    text: "A crawl of your site with every issue ranked by impact and the fix written out.",
    rows: [
      { id: "SEO-3", state: "bad", title: "Missing meta descriptions", hint: "high", side: "14 pages" },
      { id: "SEO-5", state: "half", title: "Slow largest contentful paint", hint: "medium", side: "6 pages" },
      { id: "SEO-8", state: "bad", title: "Broken internal links", hint: "high", side: "3 pages" },
    ],
    features: [
      [ScanSearch, "Full crawl", "Every page checked: titles, links, speed and schema."],
      [ListChecks, "Ranked by impact", "The issues that matter most come first."],
      [Wrench, "Fixes written out", "What to change, page by page."],
      [RefreshCw, "Check again", "Run it again after a fix to confirm."],
    ],
  },
  Cms: {
    title: "Publish to your site from Hyprlyx",
    text: "Connect WordPress or your own API, then send approved articles and fixes straight to your site.",
    rows: [
      { id: "PUB-4", state: "done", title: "How to choose a CRM for a small team", side: "Published" },
      { id: "FIX-9", state: "done", title: "Meta description on /pricing", side: "Applied" },
      { id: "PUB-5", state: "open", title: "CRM vs spreadsheet: when to switch", side: "Approved" },
    ],
    features: [
      [Plug, "WordPress or API", "Connect once with an application password or key."],
      [Send, "One-click publish", "Approved articles go live without copy and paste."],
      [Wrench, "Apply fixes", "Send SEO fixes to the right page."],
      [CircleCheck, "You approve first", "Nothing is sent without a person saying yes."],
    ],
  },
};

function Status({ state }: { state: State }) {
  return <span className={styles.st} data-state={state} aria-hidden />;
}

export default function Paywall({
  section,
  requiredPlan,
  requiredPlanId,
  currentPlan,
}: {
  section: string;
  requiredPlan: string;
  requiredPlanId: PlanId;
  currentPlan: string;
}) {
  const pitch = PITCH[section];
  const adds = [...FEATURES.filter((f) => f.plan === requiredPlanId && !f.soon).map((f) => f.text), ...usage(requiredPlanId)].slice(0, 4);
  const features: [LucideIcon, string, string][] = pitch ? pitch.features : adds.map((t) => [CircleCheck, t, ""]);

  return (
    <div className={styles.wrap}>
      <div className={styles.ghost} aria-hidden>
        <div className={styles.ghostHead} />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={styles.ghostRow}>
            <i />
            <i />
            <span style={{ width: `${34 + ((i * 17) % 30)}%` }} />
            <span className={styles.ghostSide} />
          </div>
        ))}
      </div>

      <div className={styles.card} role="dialog" aria-labelledby="paywall-title">
        <div className={styles.body}>
          <h1 id="paywall-title" className={styles.title}>
            {pitch ? pitch.title : `${section} is part of`} {pitch ? "with " : ""}
            <span className={styles.plan}>{requiredPlan}</span>
          </h1>
          <p className={styles.text}>
            {pitch ? `${pitch.text} ` : ""}You&apos;re on {currentPlan}; it opens right after you upgrade.
          </p>

          {pitch ? (
            <ul className={styles.preview} aria-label="Example">
              {pitch.rows.map((r) => (
                <li key={r.id + r.title}>
                  <span className={styles.id}>{r.id}</span>
                  <Status state={r.state} />
                  <span className={styles.rowTitle}>
                    {r.title}
                    {r.hint ? <span> · {r.hint}</span> : null}
                  </span>
                  <span className={styles.side}>{r.side}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {features.length ? (
            <div className={styles.features}>
              {features.map(([Icon, title, text]) => (
                <div key={title}>
                  <h2>
                    <Icon size={16} strokeWidth={1.6} aria-hidden />
                    {title}
                  </h2>
                  {text ? <p>{text}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.foot}>
          <Link href="/pricing" className={styles.compare}>
            Compare plans
          </Link>
          {requiredPlanId === "FREE" ? null : (
            <SubscribeButton plan={requiredPlanId as "STARTER" | "GROWTH" | "AUTOPILOT"} label={`Upgrade to ${requiredPlan}`} variant="light" />
          )}
        </div>
      </div>
    </div>
  );
}
