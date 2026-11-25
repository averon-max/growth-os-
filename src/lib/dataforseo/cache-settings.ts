/*
 * What each kind of saved DataForSEO (and AI) answer is, and how long it is kept.
 * Shared by the fetch cache (src/instrumentation.ts), the nightly cleanup and Settings → Data.
 * Saved answers are shared by every workspace: the same search is paid for once.
 */

export const DFS_CATEGORIES = {
  serp: {
    label: "Google search results",
    help: "The top results Google shows for a search: titles, links and People Also Ask questions.",
    usedIn: "AI Writer research, Keyword Planner positions, Competitors",
    def: 14,
  },
  pages: {
    label: "Pages read from other sites",
    help: "Headings and text of the pages that rank, so the writer knows what they cover.",
    usedIn: "AI Writer research",
    def: 30,
  },
  keywords: {
    label: "Keyword numbers and ideas",
    help: "Search volume, difficulty, cost per click and related keyword ideas.",
    usedIn: "Keywords, Keyword Planner, AI Writer",
    def: 0,
  },
  domains: {
    label: "Site rankings and competitors",
    help: "Which keywords a site ranks for, and which sites compete with it in Google.",
    usedIn: "Keyword Planner, Competitors",
    def: 14,
  },
  backlinks: {
    label: "Backlinks",
    help: "Sites that link to a domain, their anchor texts and link totals.",
    usedIn: "Backlinks, article backlink checks",
    def: 30,
  },
  ai: {
    label: "AI answers",
    help: "Answers from the AI model: article drafts, outlines, checks and research decisions. Research answers (topics from Google results, official sources, keyword choice) are reused when the same question comes again; articles are always written new. Cost is an estimate from token counts.",
    usedIn: "AI Writer, Keywords",
    def: 30,
  },
  other: {
    label: "Everything else",
    help: "Any other answer from DataForSEO.",
    usedIn: "Various",
    def: 30,
  },
} as const;

export type DfsCategory = keyof typeof DFS_CATEGORIES;
export const DFS_CATEGORY_KEYS = Object.keys(DFS_CATEGORIES) as DfsCategory[];
/** 0 = keep forever: the answer is never paid for again and never deleted. */
export const DAY_OPTIONS = [1, 3, 7, 14, 30, 60, 90, 180, 365, 0];
export const KEEP_FOREVER = 0;
/** Milliseconds a saved answer stays fresh; Infinity when kept forever. */
export const keepMs = (days: number) => (days === KEEP_FOREVER ? Number.POSITIVE_INFINITY : days * 86_400_000);
export const SETTINGS_KEY = "dataforseoCache";

/** endpoint is the path after https://api.dataforseo.com/, e.g. "v3/serp/google/organic/live/advanced". */
export function categoryOf(endpoint: string): DfsCategory {
  const e = endpoint.replace(/^v3\//, "");
  if (e.startsWith("serp/")) return "serp";
  if (e.startsWith("on_page/") || e.startsWith("content_analysis/")) return "pages";
  if (e.startsWith("backlinks/")) return "backlinks";
  if (e.startsWith("dataforseo_labs/") && /(ranked_keywords|competitors_domain|domain_rank_overview|domain_intersection|relevant_pages|subdomains|historical_rank_overview)/.test(e)) return "domains";
  if (e.startsWith("keywords_data/") || e.startsWith("dataforseo_labs/")) return "keywords";
  return "other";
}

export type DfsCacheSettings = { days: Record<DfsCategory, number>; dailyBudget: number };

const envBudget = () => {
  const n = Number(process.env.DATAFORSEO_DAILY_BUDGET);
  return Number.isFinite(n) && n > 0 ? n : 3;
};

/** Stored JSON → settings with defaults, every value clamped to an allowed choice. */
export function normalizeDfs(raw: unknown): DfsCacheSettings {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const days = (src.days && typeof src.days === "object" ? src.days : {}) as Record<string, unknown>;
  const out = {} as Record<DfsCategory, number>;
  for (const key of DFS_CATEGORY_KEYS) {
    const v = Math.round(Number(days[key]));
    out[key] = DAY_OPTIONS.includes(v) ? v : DFS_CATEGORIES[key].def;
  }
  const b = Number(src.dailyBudget);
  const dailyBudget = Number.isFinite(b) && b >= 0.5 && b <= 200 ? Math.round(b * 100) / 100 : envBudget();
  return { days: out, dailyBudget };
}
