"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Plus,
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
import { type PlanId } from "@/lib/billing/plans";

import styles from "./paywall.module.css";

/*
 * The card of the upgrade dialog. It follows the open tab (?tab=…), so every tab of a section explains itself
 * instead of repeating one text. Example rows use example domains and keywords, never the user's data.
 */

type State = "done" | "half" | "open" | "bad";
type Row = { id: string; state: State; title: string; hint?: string; side: string };
type Pitch = { title: string; text: string; rows: Row[]; features: [LucideIcon, string, string][] };

const PITCH: Record<string, Record<string, Pitch>> = {
  "Keyword planner": {
    "": {
      title: "Every keyword your site can rank for",
      text: "Search Console, your sitemap and Google suggestions in one list.",
      rows: [
        { id: "KP-01", state: "open", title: "crm for small business", hint: "not ranking", side: "8.1K / mo" },
        { id: "KP-02", state: "half", title: "what is a crm", hint: "#6", side: "33.1K / mo" },
        { id: "KP-03", state: "done", title: "crm pricing", hint: "#2", side: "4.4K / mo" },
      ],
      features: [
        [BarChart3, "Volume and difficulty", "For every keyword."],
        [Target, "Your position", "With the page that ranks."],
        [Compass, "Intent and topic", "What the searcher wants."],
        [Plus, "Track in one click", "Move it to Keywords."],
      ],
    },
    wins: {
      title: "Pages one push from page one",
      text: "Keywords where you rank 4–20, with the page to improve.",
      rows: [
        { id: "KP-04", state: "half", title: "best crm for small business", hint: "#11", side: "8.1K / mo" },
        { id: "KP-07", state: "half", title: "crm vs spreadsheet", hint: "#8", side: "1.3K / mo" },
        { id: "KP-12", state: "half", title: "free crm for startups", hint: "#14", side: "2.9K / mo" },
      ],
      features: [
        [Target, "Positions 4–20", "Closest to more clicks."],
        [FileText, "The page to improve", "Linked on every row."],
        [BarChart3, "Volume first", "Biggest searches on top."],
        [Plus, "Track the climb", "Add it to Keywords."],
      ],
    },
    pages: {
      title: "What every page ranks for",
      text: "Each page in your sitemap with its keywords, clicks and best position.",
      rows: [
        { id: "PG-01", state: "done", title: "/blog/crm-guide", hint: "48 keywords", side: "1,240 clicks" },
        { id: "PG-02", state: "done", title: "/pricing", hint: "12 keywords", side: "860 clicks" },
        { id: "PG-03", state: "open", title: "/blog/crm-checklist", hint: "no keywords", side: "0 clicks" },
      ],
      features: [
        [FileText, "Keywords per page", "And the top one."],
        [MousePointerClick, "Clicks and impressions", "From Search Console."],
        [Target, "Best position", "For each page."],
        [Search, "Pages with no keywords", "Rewrite or merge them."],
      ],
    },
    gaps: {
      title: "Searches you have no page for",
      text: "Keywords your site could rank for that no page targets yet.",
      rows: [
        { id: "GP-01", state: "open", title: "crm for real estate", hint: "no page", side: "6.6K / mo" },
        { id: "GP-02", state: "open", title: "crm migration checklist", hint: "no page", side: "1.9K / mo" },
        { id: "GP-03", state: "open", title: "crm onboarding email", hint: "no page", side: "880 / mo" },
      ],
      features: [
        [Search, "Uncovered searches", "Nothing on your site ranks."],
        [Plus, "Track them", "Add any gap to Keywords."],
        [BarChart3, "Volume and difficulty", "Pick the ones worth it."],
        [Layers, "By topic", "Gaps grouped together."],
      ],
    },
    cannibal: {
      title: "Stop your pages competing with each other",
      text: "Searches where two or more of your pages rank and split the clicks.",
      rows: [
        { id: "CN-01", state: "bad", title: "crm pricing", hint: "/pricing · /blog/crm-cost", side: "2 pages" },
        { id: "CN-02", state: "bad", title: "what is a crm", hint: "/blog/crm · /glossary/crm", side: "2 pages" },
        { id: "CN-03", state: "bad", title: "crm features", hint: "3 URLs", side: "3 pages" },
      ],
      features: [
        [Layers, "Pages competing", "Every URL for one search."],
        [MousePointerClick, "Clicks and position", "For that search."],
        [Link2, "Side by side", "Open each page."],
        [Wrench, "One page per search", "Merge or re-target the rest."],
      ],
    },
    clusters: {
      title: "Plan pages by topic, not by keyword",
      text: "Related keywords grouped into clusters, each one a page to write or improve.",
      rows: [
        { id: "CL-01", state: "done", title: "CRM basics", hint: "14 keywords", side: "48.2K / mo" },
        { id: "CL-02", state: "half", title: "CRM pricing", hint: "9 keywords", side: "12.4K / mo" },
        { id: "CL-03", state: "open", title: "CRM vs spreadsheets", hint: "6 keywords", side: "3.1K / mo" },
      ],
      features: [
        [Layers, "Clusters", "Keywords that belong together."],
        [BarChart3, "Volume per cluster", "Where the demand is."],
        [Target, "Average difficulty", "How hard each topic is."],
        [TrendingUp, "Average position", "Where you stand today."],
      ],
    },
    research: {
      title: "Research any keyword",
      text: "Start from a seed, or from what your competitors already rank for.",
      rows: [
        { id: "RS-01", state: "open", title: "crm automation ideas", hint: "KD 34", side: "1.6K / mo" },
        { id: "RS-02", state: "open", title: "sales pipeline template", hint: "pipeline.example #3", side: "3.6K / mo" },
        { id: "RS-03", state: "open", title: "crm data cleanup", hint: "KD 21", side: "720 / mo" },
      ],
      features: [
        [Search, "Any seed keyword", "Ideas with volume and KD."],
        [Users, "From competitors", "Their keywords you lack."],
        [BarChart3, "Volume and difficulty", "On every idea."],
        [Plus, "Track in one click", "Straight to Keywords."],
      ],
    },
  },
  Keywords: {
    "": {
      title: "Track every keyword you rank for",
      text: "Daily positions, clicks and impressions from Search Console.",
      rows: [
        { id: "KW-12", state: "done", title: "project management software", hint: "#3", side: "12.1K / mo" },
        { id: "KW-27", state: "half", title: "best crm for small business", hint: "#11", side: "8.1K / mo" },
        { id: "KW-31", state: "open", title: "crm pricing comparison", hint: "not ranking", side: "2.9K / mo" },
      ],
      features: [
        [TrendingUp, "Daily positions", "Checked every day."],
        [Target, "Quick wins", "Ranks 4–20, ready to climb."],
        [BarChart3, "Volume and CPC", "Next to each keyword."],
        [Activity, "What moved", "Up and down this week."],
      ],
    },
  },
  Content: {
    "": {
      title: "Write from live Google results",
      text: "Briefs and drafts built from the pages that rank now. You approve every one.",
      rows: [
        { id: "ART-31", state: "open", title: "How to choose a CRM for a small team", side: "Draft" },
        { id: "ART-30", state: "half", title: "CRM vs spreadsheet: when to switch", side: "In review" },
        { id: "ART-28", state: "done", title: "12 CRM features worth paying for", side: "Published" },
      ],
      features: [
        [FileText, "Briefs from real results", "Headings, questions, facts."],
        [PenLine, "Full drafts", "In your site's voice."],
        [CircleCheck, "Approval first", "Nothing goes live alone."],
        [FileSearch, "Sources you can check", "The results each draft used."],
      ],
    },
  },
  Competitors: {
    "": {
      title: "See who outranks you, and where",
      text: "Their keywords, your gaps and your wins, competitor by competitor.",
      rows: [
        { id: "CO-01", state: "bad", title: "pipeline.example", hint: "312 gaps", side: "4,120 keywords" },
        { id: "CO-02", state: "half", title: "crmhub.example", hint: "198 gaps", side: "2,870 keywords" },
        { id: "CO-03", state: "done", title: "salesdesk.example", hint: "you lead", side: "1,940 keywords" },
      ],
      features: [
        [Users, "Every competitor", "Any site you meet in Google."],
        [Search, "Keyword gaps", "Their top 10, not yours."],
        [TrendingUp, "Wins and losses", "Keyword by keyword."],
        [Link2, "Referring domains", "For each of them."],
      ],
    },
  },
  Backlinks: {
    "": {
      title: "Know every site that links to you",
      text: "Referring domains, links and anchors, with new and lost links.",
      rows: [
        { id: "BL-07", state: "done", title: "news.example", hint: "dofollow", side: "3 links" },
        { id: "BL-11", state: "done", title: "guide.example", hint: "dofollow", side: "1 link" },
        { id: "BL-14", state: "open", title: "forum.example", hint: "lost", side: "2 links" },
      ],
      features: [
        [Globe, "Referring domains", "With their strength."],
        [Link2, "New and lost", "As they change."],
        [FileSearch, "Anchors and pages", "Which words link where."],
        [Upload, "CSV import", "Search Console, Ahrefs, Bing."],
      ],
    },
  },
  "Traffic report": {
    "": {
      title: "Clicks and visits on one screen",
      text: "Google clicks next to Cloudflare visits, with the pages behind each change.",
      rows: [
        { id: "TR-01", state: "done", title: "/blog/crm-guide", hint: "+18%", side: "1,240 clicks" },
        { id: "TR-02", state: "done", title: "/pricing", hint: "+4%", side: "860 clicks" },
        { id: "TR-03", state: "bad", title: "/compare/crm-vs-sheets", hint: "−6%", side: "410 clicks" },
      ],
      features: [
        [MousePointerClick, "Google clicks", "CTR and position too."],
        [Activity, "Real visits", "Bots kept apart."],
        [MapPin, "Countries and pages", "Where visits land."],
        [TrendingUp, "Biggest movers", "Week over week."],
      ],
    },
  },
  Bots: {
    "": {
      title: "See which crawlers read your site",
      text: "Search and AI crawlers from Cloudflare, verified and counted daily.",
      rows: [
        { id: "BOT-1", state: "done", title: "Googlebot", hint: "verified", side: "18,420 requests" },
        { id: "BOT-2", state: "done", title: "GPTBot", hint: "verified", side: "2,310 requests" },
        { id: "BOT-3", state: "open", title: "Unknown crawler", hint: "not verified", side: "940 requests" },
      ],
      features: [
        [Bot, "AI crawlers", "GPTBot, ClaudeBot, more."],
        [ShieldCheck, "Verified only", "Fakes kept apart."],
        [FileSearch, "Pages they read", "Per crawler."],
        [Activity, "Day by day", "Crawl activity over time."],
      ],
    },
  },
  Audience: {
    "": {
      title: "Know who visits",
      text: "Visitors, countries and pages from Analytics 4 and Cloudflare.",
      rows: [
        { id: "US", state: "done", title: "United States", hint: "42%", side: "8,240 visitors" },
        { id: "GB", state: "done", title: "United Kingdom", hint: "11%", side: "2,160 visitors" },
        { id: "DE", state: "half", title: "Germany", hint: "7%", side: "1,380 visitors" },
      ],
      features: [
        [Users, "Visitors", "Daily, from both sources."],
        [MapPin, "Countries", "On a map."],
        [Search, "Search queries", "Before they arrived."],
        [Activity, "Trends", "Audience over time."],
      ],
    },
  },
  Seo: {
    "": {
      title: "Find what holds your pages back",
      text: "A crawl of your site, issues ranked by impact, each fix written out.",
      rows: [
        { id: "SEO-3", state: "bad", title: "Missing meta descriptions", hint: "high", side: "14 pages" },
        { id: "SEO-5", state: "half", title: "Slow largest contentful paint", hint: "medium", side: "6 pages" },
        { id: "SEO-8", state: "bad", title: "Broken internal links", hint: "high", side: "3 pages" },
      ],
      features: [
        [ScanSearch, "Full crawl", "Titles, links, speed, schema."],
        [ListChecks, "By impact", "What matters first."],
        [Wrench, "Fixes written out", "Page by page."],
        [RefreshCw, "Check again", "Confirm each fix."],
      ],
    },
  },
  Cms: {
    "": {
      title: "Publish to your site from Hyprlyx",
      text: "Connect WordPress or your own API, then send approved articles and fixes.",
      rows: [
        { id: "PUB-4", state: "done", title: "How to choose a CRM for a small team", side: "Published" },
        { id: "FIX-9", state: "done", title: "Meta description on /pricing", side: "Applied" },
        { id: "PUB-5", state: "open", title: "CRM vs spreadsheet: when to switch", side: "Approved" },
      ],
      features: [
        [Plug, "WordPress or API", "Connect once."],
        [Send, "One-click publish", "No copy and paste."],
        [Wrench, "Apply fixes", "On the right page."],
        [CircleCheck, "You approve first", "Always."],
      ],
    },
  },
};

function Status({ state }: { state: State }) {
  return <span className={styles.st} data-state={state} aria-hidden />;
}

export function PaywallCard({
  section,
  requiredPlan,
  requiredPlanId,
  currentPlan,
  adds,
}: {
  section: string;
  requiredPlan: string;
  requiredPlanId: PlanId;
  currentPlan: string;
  adds: string[];
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") ?? "");

  // The sidebar switches tabs without a navigation (history.replaceState + "hx:subnav-go"), so listen for it.
  useEffect(() => {
    const read = () => setTab(new URLSearchParams(window.location.search).get("tab") ?? "");
    read();
    window.addEventListener("hx:subnav-go", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("hx:subnav-go", read);
      window.removeEventListener("popstate", read);
    };
  }, [params]);

  const tabs = PITCH[section];
  const pitch = tabs ? (tabs[tab] ?? tabs[""]) : undefined;
  const features: [LucideIcon, string, string][] = pitch ? pitch.features : adds.map((t) => [CircleCheck, t, ""]);

  return (
    <div className={styles.card} role="dialog" aria-labelledby="paywall-title">
      <div key={tab} className={styles.body}>
        <h1 id="paywall-title" className={styles.title}>
          {pitch ? `${pitch.title} with ` : `${section} is part of `}
          <span className={styles.plan}>{requiredPlan}</span>
        </h1>
        <p className={styles.text}>{pitch ? pitch.text : `You're on ${currentPlan}.`}</p>

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
  );
}
