import type { LucideIcon } from "lucide-react";
import { Activity, Bot, Compass, FileText, Link2, Plug, ScanSearch, Tags, Target } from "lucide-react";

export type Feature = {
  slug: string;
  name: string;
  icon: LucideIcon;
  short: string;
  title: string;
  lede: string;
  /** Search result title (≤60 chars) and description (~150 chars), written around the main search term. */
  seoTitle: string;
  seoDescription: string;
  shot?: { src: string; alt: string; w?: number; h?: number; extra?: { src: string; alt: string; w: number; h: number } };
  stats?: { value: string; label: string }[];
  /** Extra product views shown as their own sections (title left, text right, wide screen below). */
  gallery?: { title: string; text: string; src: string; alt: string; w: number; h: number }[];
  points: { title: string; text: string }[];
  /** Short definitions of the terms the page uses — useful for readers and for search. */
  terms: { term: string; def: string }[];
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
    seoTitle: "Keyword Research Tool: Volume, Difficulty & Trends | Hyprlyx",
    seoDescription: "Find keywords worth ranking for: search volume, keyword difficulty, CPC and rising searches from Google Trends, for any market. Try Hyprlyx free.",
    shot: { src: "/landing/keywords-v12.webp", alt: "Keyword research: top keywords in your industry with rising and top searches from Google Trends, volume, trend, difficulty and CPC", w: 2400, h: 1306 },
    gallery: [
      { title: "Every number behind a keyword", text: "Open any keyword for monthly volume, difficulty, cost per click, ad competition, change over the last month, quarter and year, a 12-month volume chart and volume by country.", src: "/landing/keyword-detail-v12.webp", alt: "Keyword detail: volume, difficulty, CPC, ad competition, 12-month search volume and volume by country", w: 2400, h: 1306 },
      { title: "From research to a plan", text: "Keywords you track land in Keyword Planner next to your rankings and pages, grouped into quick wins, gaps and clusters.", src: "/landing/planner-v11.webp", alt: "Keyword Planner with tracked keywords, positions and pages", w: 2048, h: 1110 },
    ],
    points: [
      { title: "Industry keywords", text: "Start from your niche, not a blank box. Hyprlyx surfaces the searches your market actually makes." },
      { title: "Search momentum", text: "Rising and top searches from Google Trends, so you catch demand while it's growing." },
      { title: "Filters that matter", text: "Low difficulty, high volume, commercial CPC, growing trend — one click each." },
      { title: "Saved for your team", text: "Keyword metrics are saved in your workspace, so everyone on the team works from the same numbers." },
    ],
    terms: [{ term: "Search volume", def: "How many times a keyword is searched on Google per month in the market you pick, averaged over the last 12 months." }, { term: "Keyword difficulty", def: "A 0–100 estimate of how hard it is to reach the top 10, based on the strength of the pages already ranking. Lower is easier." }, { term: "CPC", def: "Cost per click: what advertisers pay for one click on this keyword in Google Ads. A high CPC usually means the search is close to a purchase." }, { term: "Rising searches", def: "Queries whose Google Trends interest grew fastest recently — demand you can catch before it peaks." }],
    faq: [
      { q: "Where does the data come from?", a: "Volume, difficulty and CPC come from DataForSEO. Trend and rising searches come from Google Trends." },
      { q: "Which countries are supported?", a: "Any market and language DataForSEO covers. You choose the market per website." }, { q: "How is keyword difficulty calculated?", a: "Difficulty comes from DataForSEO and reflects the strength of the pages already in the top results. Use it to compare keywords, not as an exact promise." }, { q: "Can I track a keyword I find here?", a: "Yes. Add it to Keyword Planner in one click and Hyprlyx follows its volume, position and the page that should win it." }],
  },
  {
    slug: "planner",
    name: "Keyword Planner",
    icon: Compass,
    short: "One plan for every keyword you care about",
    title: "Plan before you publish",
    lede: "Search Console data, live rankings, your existing pages and tracked keywords in one list — grouped into what you already rank for, quick wins, and gaps with no page yet.",
    seoTitle: "Keyword Planner for SEO: Quick Wins & Content Gaps | Hyprlyx",
    seoDescription: "Plan your content from real data: Search Console, live rankings and tracked keywords grouped into quick wins, clusters and gaps with no page yet.",
    shot: { src: "/landing/planner-v11.webp", alt: "Keyword Planner grouping tracked keywords, quick wins and gaps", w: 2048, h: 1110 },
    gallery: [
      { title: "Your traffic, next to the plan", text: "The overview keeps Search Console clicks, impressions and positions beside traffic and countries, so you can see whether last month's pages moved anything.", src: "/landing/overview-v16.webp", alt: "Hyprlyx overview with Google Search, traffic and countries", w: 2400, h: 1500 },
    ],
    points: [
      { title: "Quick wins", text: "Keywords sitting just off page one, where a small improvement moves real traffic." },
      { title: "Gaps", text: "Searches you have no page for yet, with volume and difficulty to prioritize them." },
      { title: "Clusters", text: "Related keywords grouped so one page can win a whole topic instead of one phrase." },
      { title: "Evidence, not guesses", text: "Every recommendation shows the data behind it. If the evidence is thin, Hyprlyx says so." },
    ],
    terms: [{ term: "Quick win", def: "A query where your page already ranks on page two, around positions 11–20, with real impressions. A better page often moves it onto page one." }, { term: "Content gap", def: "A keyword with search demand where you have no page at all." }, { term: "Keyword cluster", def: "A group of closely related searches that one strong page can rank for together." }, { term: "Tracked keyword", def: "A keyword you add to the plan so its volume, position and page are followed over time." }],
    faq: [
      { q: "Do I need Search Console?", a: "It's strongly recommended — it's where your real impressions and positions come from. Planner still works with tracked keywords without it." }, { q: "What counts as a quick win?", a: "A query where you already rank around positions 11–20 with real impressions. Improving the existing page is usually faster than writing a new one." }, { q: "How many keywords can I track?", a: "It depends on your plan, from 500 on Starter upward. See the pricing page for each plan." }],
  },
  {
    slug: "rankings",
    name: "Rankings",
    icon: Activity,
    short: "Impressions, clicks and positions from Search Console",
    title: "See where you stand, every day",
    lede: "Your real Google performance — impressions, clicks, CTR and average position — with the queries closest to page one pulled to the top.",
    seoTitle: "Rank Tracker with Google Search Console Data | Hyprlyx",
    seoDescription: "Track Google rankings, impressions and clicks for every page and query, with the keywords closest to page one surfaced first. Free to start.",
    shot: { src: "/landing/search-console-v12.webp", alt: "Search Console report: queries, impressions, clicks, average position, visibility chart and easiest wins", w: 3200, h: 1760 },
    gallery: [
      { title: "Rankings on your overview", text: "Clicks, impressions and average position from Search Console, with the trend for the period you choose, on the first screen you open.", src: "/landing/overview-v16.webp", alt: "Overview with Google Search clicks, impressions and average position", w: 2400, h: 1500 },
    ],
    points: [
      { title: "Visibility over time", text: "Impressions, clicks and position on one chart for 7, 28 or 90 days." },
      { title: "Position distribution", text: "How many queries sit in the top 3, top 10, page two and beyond." },
      { title: "Movement", text: "Which queries went up and which went down since the last period." },
      { title: "History that lasts", text: "Daily detail for a month, then compact weekly and monthly history for years." },
    ],
    terms: [{ term: "Impressions", def: "How many times your pages appeared in Google results for a query, whether or not anyone clicked." }, { term: "Clicks", def: "How many times searchers clicked through to your site from Google." }, { term: "CTR", def: "Click-through rate: clicks divided by impressions. It shows how compelling your result is at its position." }, { term: "Average position", def: "Your mean ranking for a query across all impressions. Position 1 is the top result; lower numbers are better." }],
    faq: [
      { q: "Is this the same data as Search Console?", a: "Yes — it's read directly from Google's Search Console API, nothing is estimated." },
      { q: "How fresh is it?", a: "Google publishes Search Console data with a 2–3 day delay; Hyprlyx picks it up as soon as it's available." }, { q: "How fresh is the data?", a: "Search Console publishes data with a delay of about two days. Hyprlyx shows the latest days Google has released." }, { q: "Which periods can I compare?", a: "7, 28 and 90 days, each compared with the period before it." }],
  },
  {
    slug: "content",
    name: "Content",
    icon: FileText,
    short: "Briefs and drafts based on what already ranks",
    title: "Turn findings into pages",
    lede: "When a gap or quick win needs a page, Hyprlyx prepares a brief from the live search results and can draft it for you to review. Nothing is published without approval.",
    seoTitle: "AI SEO Writer: Briefs and Drafts from What Ranks | Hyprlyx",
    seoDescription: "Turn keyword gaps into pages: SEO content briefs and AI drafts built from what already ranks on Google. You review and approve every page.",
    shot: { src: "/landing/content-v12.webp", alt: "Content library with drafts, approved and published articles, formats, intent and quality scores", w: 3200, h: 1733 },
    gallery: [
      { title: "Start from a real gap", text: "Briefs begin with keywords that have demand and no strong page on your site yet, so every article has a reason to exist.", src: "/landing/planner-v11.webp", alt: "Keyword Planner showing quick wins and gaps to write for", w: 2048, h: 1110 },
      { title: "Follow every page after it ships", text: "Published pages show up in rankings and traffic, so you can see which articles earn clicks.", src: "/landing/search-console-v12.webp", alt: "Search Console report with impressions, clicks and positions", w: 3200, h: 1760 },
    ],
    points: [
      { title: "Briefs from real results", text: "Structure, questions and topics taken from the pages that already rank." },
      { title: "Review first", text: "Drafts, approved and published are separate stages — you stay in control." },
      { title: "Copy or export", text: "Copy approved pages into your site in one go. Direct publishing to WordPress and other CMSs is coming soon." },
    ],
    terms: [{ term: "Content brief", def: "A plan for one page: the target keyword, search intent, format, the questions to answer and what the top results cover." }, { term: "Search intent", def: "What the searcher wants — to learn, compare or buy. Pages that match intent rank; pages that don't, rarely do." }, { term: "Article format", def: "Guide, how-to, step-by-step, comparison or listicle — chosen to match what already ranks for the keyword." }, { term: "Approval", def: "Every draft waits for a person to review and approve it. Nothing is published on its own." }],
    faq: [{ q: "Does it publish automatically?", a: "No. Every page needs your approval first." }, { q: "What goes into a brief?", a: "The target keyword, search intent, the article format, the questions searchers ask and what the top-ranking pages cover." }, { q: "Which formats can it write?", a: "Guides, how-tos, step-by-step articles, comparisons and listicles — picked to match what already ranks for the keyword." }],
  },
  {
    slug: "audit",
    name: "Site audit",
    icon: ScanSearch,
    shot: { src: "/landing/overview-v16.webp", alt: "Overview with the SEO score and issues by severity next to traffic and rankings", w: 2400, h: 1500 },
    short: "Technical SEO checks with clear fixes",
    title: "Find what's holding your site back",
    lede: "Hyprlyx crawls your site and checks titles, descriptions, headings, canonicals, indexability, internal links, images and speed — then ranks issues by impact.",
    seoTitle: "Technical SEO Audit Tool with Prioritized Fixes | Hyprlyx",
    seoDescription: "Crawl your site and check titles, meta descriptions, headings, canonicals, indexability, links and speed — issues ranked by impact, with fixes.",
    stats: [
      { value: "40+", label: "checks per page" },
      { value: "4", label: "scores: technical, content, structure, indexability" },
      { value: "Per page", label: "list of pages each issue affects" },
    ],
    points: [
      { title: "Prioritized issues", text: "Critical problems first, cosmetic ones last — each with the pages affected." },
      { title: "Plain-language fixes", text: "Every issue explains what's wrong and exactly what to change." },
      { title: "Fixes in your CMS — coming soon", text: "One-click fixes for titles, descriptions and alt text through your CMS are on the way." },
      { title: "Re-check anytime", text: "Run the audit again after changes and compare scores." },
    ],
    terms: [{ term: "Indexability", def: "Whether Google is allowed and able to add a page to its index — blocked by robots rules, noindex tags or errors, it can't rank." }, { term: "Canonical tag", def: "A tag that tells search engines which URL is the main version of a page, so duplicates don't compete." }, { term: "Title tag", def: "The page title shown as the blue headline in search results. One clear, unique title per page." }, { term: "Meta description", def: "The short summary under the title in results. It doesn't rank by itself, but a good one earns more clicks." }],
    faq: [{ q: "Will the crawl slow my site down?", a: "No. Pages are fetched gently, one at a time, like a regular search engine bot." }, { q: "What does the audit check?", a: "Titles, meta descriptions, headings, canonical tags, indexability, internal links, images and page speed on every page it crawls." }, { q: "How is the SEO score worked out?", a: "It summarises the issues found, weighted by severity — critical and high issues lower it most." }],
  },
  {
    slug: "backlinks",
    name: "Backlinks",
    icon: Link2,
    shot: { src: "/landing/backlinks-v11.webp", alt: "Backlinks: link quality, link types, anchors and new linking domains", w: 1586, h: 860 },
    short: "Referring domains, links and anchors",
    title: "Know who links to you",
    lede: "Referring domains, individual links and anchor texts — from DataForSEO or free imports from Search Console, Bing and Ahrefs exports.",
    seoTitle: "Backlink Checker: Referring Domains & Anchors | Hyprlyx",
    seoDescription: "See who links to your site: referring domains, backlinks, anchor text, link types and spam score, plus new and lost links over time.",
    stats: [
      { value: "Free", label: "imports from GSC, Bing and Ahrefs CSV" },
      { value: "Per page", label: "links tracked for each published article" },
      { value: "Anchors", label: "and nofollow / sponsored flags" },
    ],
    gallery: [
      { title: "See the sites you compete with", text: "Track competitors' keywords and traffic and find the gaps where they rank and you don't — in the same workspace as your links.", src: "/landing/competitors-v11.webp", alt: "Competitors with keyword gaps and tracked domains", w: 1585, h: 930 },
    ],
    points: [
      { title: "Referring domains", text: "Who links to you, how often, and since when." },
      { title: "Per-article tracking", text: "See which of your pages actually earn links over time." },
      { title: "Link attributes", text: "Nofollow, sponsored and UGC flags so you know which links count." },
    ],
    terms: [{ term: "Backlink", def: "A link from another website to yours. Links from relevant, trusted sites are one of Google's strongest ranking signals." }, { term: "Referring domain", def: "A unique website that links to you. Ten links from one site count as one referring domain." }, { term: "Anchor text", def: "The clickable words of a link. It tells search engines what the linked page is about." }, { term: "Nofollow, sponsored, UGC", def: "Link attributes telling Google not to pass ranking credit — used for ads, paid placements and user comments." }],
    faq: [{ q: "Do I need a paid data source?", a: "No. Free imports from Search Console and Bing work on every plan." }, { q: "What is spam score?", a: "An estimate of how likely a linking site is low quality or manipulative. A few high-spam links are normal; many can be worth a closer look." }, { q: "Can I see new and lost links?", a: "Yes. New linking domains and links that disappeared are listed by date." }],
  },
  {
    slug: "competitors",
    name: "Competitors",
    icon: Target,
    shot: { src: "/landing/competitors-v11.webp", alt: "Competitors: tracked domains, keyword gaps and who wins your keywords", w: 1585, h: 930 },
    short: "Track rivals and the keywords they win",
    title: "Watch the sites you compete with",
    lede: "Add competitors and see their pages, ranking keywords and the gaps where they rank and you don't.",
    seoTitle: "SEO Competitor Analysis & Keyword Gap Tool | Hyprlyx",
    seoDescription: "Track competitors' ranking keywords, traffic and backlinks, and find the keyword gaps where they rank and you don't.",
    stats: [
      { value: "Gaps", label: "keywords they rank for and you don't" },
      { value: "Top keywords", label: "for every competitor" },
      { value: "Snapshots", label: "to see how they change over time" },
    ],
    gallery: [
      { title: "And the links behind them", text: "Referring domains, link types, anchors and spam score for your own site, so you know which links count and which to ignore.", src: "/landing/backlinks-v11.webp", alt: "Backlinks: link quality, types, anchors and new domains", w: 1586, h: 860 },
    ],
    points: [
      { title: "Keyword gaps", text: "The searches competitors win that you have no page for." },
      { title: "On-page comparison", text: "Titles, headings, length, images and structured data side by side." },
      { title: "History", text: "Regular snapshots show what competitors changed and when." },
    ],
    terms: [{ term: "Organic competitor", def: "A site that ranks for the same keywords you target — often different from your business competitors." }, { term: "Keyword gap", def: "Searches where a competitor ranks and you don't. The best gaps have demand and a reachable difficulty." }, { term: "Ranking keywords", def: "All the queries a domain appears for in Google's top results, with position and estimated traffic." }, { term: "Estimated traffic", def: "Visits a page or domain likely gets from its rankings, estimated from search volume and click-through by position." }],
    faq: [{ q: "How many competitors can I track?", a: "It depends on your plan — see the comparison on the pricing page." }, { q: "Where does competitor data come from?", a: "Ranking keywords, traffic estimates and backlinks come from DataForSEO." }, { q: "How do I use a keyword gap?", a: "Send the best gaps to Keyword Planner, then write or improve the page that should rank for them." }],
  },
  {
    slug: "traffic",
    name: "Traffic & bots",
    icon: Bot,
    shot: { src: "/landing/traffic-v11.webp", alt: "Traffic report: visits by country and top pages, day by day", w: 2048, h: 1110 },
    short: "Visitors, countries, pages — and AI crawlers",
    title: "See who visits — people and bots",
    lede: "Audience data from Google Analytics 4 and traffic from Cloudflare, including which search engines and AI crawlers read your site.",
    seoTitle: "AI Crawler Tracking: GPTBot, ClaudeBot & Traffic | Hyprlyx",
    seoDescription: "See which search engines and AI crawlers like GPTBot, ClaudeBot and PerplexityBot visit your site, plus visitors by country and page.",
    stats: [
      { value: "GA4", label: "visitors, countries, devices, pages" },
      { value: "Cloudflare", label: "requests, threats and bandwidth" },
      { value: "AI bots", label: "GPTBot, ClaudeBot, PerplexityBot and more" },
    ],
    gallery: [
      { title: "Where visitors come from", text: "Visits by country on a map, with the top pages for each period. Switch between Cloudflare visits, Google clicks and Google impressions.", src: "/landing/audience-v11.webp", alt: "Audience: countries map and visits by country", w: 2048, h: 1050 },
      { title: "Every crawler, verified", text: "Search engines, AI assistants and other bots split out from people, with the pages they read most and how often they come back.", src: "/landing/bots-v11.webp", alt: "Bots and crawlers by category with most crawled pages", w: 2048, h: 1110 },
    ],
    points: [
      { title: "Audience", text: "Visitors by country, device and page from Google Analytics 4." },
      { title: "Bots & crawlers", text: "Search engines and AI crawlers separated from human traffic." },
      { title: "Per-page traffic", text: "Which pages get visits and which only get crawled." },
    ],
    terms: [{ term: "Verified bot", def: "A crawler Cloudflare has confirmed is who it claims to be — Googlebot, Bingbot and similar — rather than a fake user agent." }, { term: "AI crawler", def: "A bot that reads pages for AI products, such as GPTBot (OpenAI), ClaudeBot (Anthropic) or PerplexityBot." }, { term: "Human visits", def: "Requests from real browsers after known bots are separated out." }, { term: "Bot share", def: "The part of all traffic that comes from verified bots, day by day." }],
    faq: [{ q: "Do I need both?", a: "No. Either one works on its own; together they give the full picture." }, { q: "What is a verified bot?", a: "A crawler Cloudflare has confirmed is genuine — Googlebot, Bingbot and others — so fake user agents don't inflate the numbers." }, { q: "Which AI crawlers can I see?", a: "GPTBot, ClaudeBot, PerplexityBot and the other AI crawlers Cloudflare identifies, with the pages they read most." }],
  },
];

export const INTEGRATIONS = [
  { name: "Google Search Console", text: "Real impressions, clicks and positions" },
  { name: "Google Analytics 4", text: "Visitors, countries and pages" },
  { name: "Cloudflare", text: "Traffic, threats and AI crawlers" },
  { name: "DataForSEO", text: "Keyword, SERP and backlink data" },
  { name: "Google Trends", text: "Rising and top searches" },
  { name: "WordPress & custom CMS", text: "Coming soon: publish and fix pages", icon: Plug },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
