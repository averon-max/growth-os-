import type { LucideIcon } from "lucide-react";
import { Activity, Bot, Compass, FileText, Link2, Plug, ScanSearch, Tags, Target } from "lucide-react";

export type Feature = {
  slug: string;
  name: string;
  icon: LucideIcon;
  short: string;
  title: string;
  lede: string;
  shot?: { src: string; alt: string };
  stats?: { value: string; label: string }[];
  points: { title: string; text: string }[];
  steps: string[];
  faq: { q: string; a: string }[];
};

/** Product pages. Order = order in menus. The writer sits in the middle on purpose, as one tool among many. */
export const FEATURES: Feature[] = [
  {
    slug: "keywords",
    name: "Keyword research",
    icon: Tags,
    short: "Volume, difficulty, CPC and trends for every keyword",
    title: "Know exactly what people search for",
    lede: "Find the keywords worth your time: real search volume, difficulty, cost per click and direction of travel — plus rising searches from Google Trends before your competitors notice them.",
    shot: { src: "/landing/keywords-v9.webp", alt: "Keyword research with rising searches, volume, difficulty and CPC" },
    points: [
      { title: "Industry keywords", text: "Start from your niche, not a blank box. Hyprlyx surfaces the searches your market actually makes." },
      { title: "Search momentum", text: "Rising and top searches from Google Trends, so you catch demand while it's growing." },
      { title: "Filters that matter", text: "Low difficulty, high volume, commercial CPC, growing trend — one click each." },
      { title: "Cached and reused", text: "Metrics are cached and shared across your workspace, so refreshing data doesn't burn your budget." },
    ],
    steps: ["Add your website and niche", "Review suggested and rising keywords", "Track the ones that matter in Keyword Planner"],
    faq: [
      { q: "Where does the data come from?", a: "Volume, difficulty and CPC come from DataForSEO. Trend and rising searches come from Google Trends." },
      { q: "Which countries are supported?", a: "Any market and language DataForSEO covers. You choose the market per website." },
    ],
  },
  {
    slug: "planner",
    name: "Keyword Planner",
    icon: Compass,
    short: "One plan for every keyword you care about",
    title: "Plan before you publish",
    lede: "Search Console data, live rankings, your existing pages and tracked keywords in one list — grouped into what you already rank for, quick wins, and gaps with no page yet.",
    shot: { src: "/landing/planner-v9.webp", alt: "Keyword Planner grouping tracked keywords, quick wins and gaps" },
    points: [
      { title: "Quick wins", text: "Keywords sitting just off page one, where a small improvement moves real traffic." },
      { title: "Gaps", text: "Searches you have no page for yet, with volume and difficulty to prioritize them." },
      { title: "Clusters", text: "Related keywords grouped so one page can win a whole topic instead of one phrase." },
      { title: "Evidence, not guesses", text: "Every recommendation shows the data behind it. If the evidence is thin, Hyprlyx says so." },
    ],
    steps: ["Connect Search Console", "Track keywords from research or import them", "Work through quick wins and gaps"],
    faq: [
      { q: "Do I need Search Console?", a: "It's strongly recommended — it's where your real impressions and positions come from. Planner still works with tracked keywords without it." },
    ],
  },
  {
    slug: "rankings",
    name: "Rankings",
    icon: Activity,
    short: "Impressions, clicks and positions from Search Console",
    title: "See where you stand, every day",
    lede: "Your real Google performance — impressions, clicks, CTR and average position — with the queries closest to page one pulled to the top.",
    shot: { src: "/landing/search-console-v9.webp", alt: "Search Console view with visibility chart and easiest wins" },
    points: [
      { title: "Visibility over time", text: "Impressions, clicks and position on one chart for 7, 28 or 90 days." },
      { title: "Position distribution", text: "How many queries sit in the top 3, top 10, page two and beyond." },
      { title: "Movement", text: "Which queries went up and which went down since the last period." },
      { title: "History that lasts", text: "Daily detail for a month, then compact weekly and monthly history for years." },
    ],
    steps: ["Connect Google Search Console", "Pick the property", "Rankings refresh automatically"],
    faq: [
      { q: "Is this the same data as Search Console?", a: "Yes — it's read directly from Google's Search Console API, nothing is estimated." },
      { q: "How fresh is it?", a: "Google publishes Search Console data with a 2–3 day delay; Hyprlyx picks it up as soon as it's available." },
    ],
  },
  {
    slug: "content",
    name: "Content",
    icon: FileText,
    short: "Briefs and drafts based on what already ranks",
    title: "Turn findings into pages",
    lede: "When a gap or quick win needs a page, Hyprlyx prepares a brief from the live search results and can draft it for you to review. Nothing is published without approval.",
    shot: { src: "/landing/content-v9.webp", alt: "Content library with drafts, approved and published pages" },
    points: [
      { title: "Briefs from real results", text: "Structure, questions and topics taken from the pages that already rank." },
      { title: "Review first", text: "Drafts, approved and published are separate stages — you stay in control." },
      { title: "Publish to your CMS", text: "Send approved pages to WordPress or your own site through the CMS connection." },
    ],
    steps: ["Pick a gap or quick win", "Review the brief and draft", "Approve and publish"],
    faq: [{ q: "Does it publish automatically?", a: "No. Every page needs your approval first." }],
  },
  {
    slug: "audit",
    name: "Site audit",
    icon: ScanSearch,
    short: "Technical SEO checks with clear fixes",
    title: "Find what's holding your site back",
    lede: "Hyprlyx crawls your site and checks titles, descriptions, headings, canonicals, indexability, internal links, images and speed — then ranks issues by impact.",
    stats: [
      { value: "40+", label: "checks per page" },
      { value: "4", label: "scores: technical, content, structure, indexability" },
      { value: "1 click", label: "fixes through your CMS" },
    ],
    points: [
      { title: "Prioritized issues", text: "Critical problems first, cosmetic ones last — each with the pages affected." },
      { title: "Plain-language fixes", text: "Every issue explains what's wrong and exactly what to change." },
      { title: "Safe automatic fixes", text: "Titles, descriptions, alt text and more can be fixed through your CMS — with a record of the previous value." },
      { title: "Re-check anytime", text: "Run the audit again after changes and compare scores." },
    ],
    steps: ["Add your website", "Run the audit", "Fix issues in order of impact"],
    faq: [{ q: "Will the crawl slow my site down?", a: "No. Pages are fetched gently, one at a time, like a regular search engine bot." }],
  },
  {
    slug: "backlinks",
    name: "Backlinks",
    icon: Link2,
    short: "Referring domains, links and anchors",
    title: "Know who links to you",
    lede: "Referring domains, individual links and anchor texts — from DataForSEO or free imports from Search Console, Bing and Ahrefs exports.",
    stats: [
      { value: "Free", label: "imports from GSC, Bing and Ahrefs CSV" },
      { value: "Per page", label: "links tracked for each published article" },
      { value: "Anchors", label: "and nofollow / sponsored flags" },
    ],
    points: [
      { title: "Referring domains", text: "Who links to you, how often, and since when." },
      { title: "Per-article tracking", text: "See which of your pages actually earn links over time." },
      { title: "Link attributes", text: "Nofollow, sponsored and UGC flags so you know which links count." },
    ],
    steps: ["Import a CSV or connect the data source", "Review domains and anchors", "Track new and lost links"],
    faq: [{ q: "Do I need a paid data source?", a: "No. Free imports from Search Console and Bing work on every plan." }],
  },
  {
    slug: "competitors",
    name: "Competitors",
    icon: Target,
    short: "Track rivals and the keywords they win",
    title: "Watch the sites you compete with",
    lede: "Add competitors and see their pages, ranking keywords and the gaps where they rank and you don't.",
    stats: [
      { value: "Gaps", label: "keywords they rank for and you don't" },
      { value: "Top keywords", label: "for every competitor" },
      { value: "Snapshots", label: "to see how they change over time" },
    ],
    points: [
      { title: "Keyword gaps", text: "The searches competitors win that you have no page for." },
      { title: "On-page comparison", text: "Titles, headings, length, images and structured data side by side." },
      { title: "History", text: "Regular snapshots show what competitors changed and when." },
    ],
    steps: ["Add a competitor domain", "Review their keywords and gaps", "Send the best gaps to your plan"],
    faq: [{ q: "How many competitors can I track?", a: "It depends on your plan — see the comparison on the pricing page." }],
  },
  {
    slug: "traffic",
    name: "Traffic & bots",
    icon: Bot,
    short: "Visitors, countries, pages — and AI crawlers",
    title: "See who visits — people and bots",
    lede: "Audience data from Google Analytics 4 and traffic from Cloudflare, including which search engines and AI crawlers read your site.",
    stats: [
      { value: "GA4", label: "visitors, countries, devices, pages" },
      { value: "Cloudflare", label: "requests, threats and bandwidth" },
      { value: "AI bots", label: "GPTBot, ClaudeBot, PerplexityBot and more" },
    ],
    points: [
      { title: "Audience", text: "Visitors by country, device and page from Google Analytics 4." },
      { title: "Bots & crawlers", text: "Search engines and AI crawlers separated from human traffic." },
      { title: "Per-page traffic", text: "Which pages get visits and which only get crawled." },
    ],
    steps: ["Connect GA4 and/or Cloudflare", "Choose the property or zone", "Traffic updates daily"],
    faq: [{ q: "Do I need both?", a: "No. Either one works on its own; together they give the full picture." }],
  },
];

export const INTEGRATIONS = [
  { name: "Google Search Console", text: "Real impressions, clicks and positions" },
  { name: "Google Analytics 4", text: "Visitors, countries and pages" },
  { name: "Cloudflare", text: "Traffic, threats and AI crawlers" },
  { name: "DataForSEO", text: "Keyword, SERP and backlink data" },
  { name: "Google Trends", text: "Rising and top searches" },
  { name: "WordPress & custom CMS", text: "Publish and fix pages", icon: Plug },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
