export type ArticleCategory =
  | "definition" | "how-it-works" | "how-to" | "troubleshooting"
  | "comparison" | "best-options" | "alternatives" | "review"
  | "pricing" | "benefits-risks" | "beginners-guide" | "checklist"
  | "case-study" | "statistics" | "industry-analysis";

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  "definition":        "Definition / What Is",
  "how-it-works":      "How It Works",
  "how-to":            "How-To Guide",
  "troubleshooting":   "Troubleshooting",
  "comparison":        "Comparison",
  "best-options":      "Best / Top Options",
  "alternatives":      "Alternatives",
  "review":            "Review",
  "pricing":           "Pricing / Cost",
  "benefits-risks":    "Benefits & Risks",
  "beginners-guide":   "Beginner's Guide",
  "checklist":         "Checklist",
  "case-study":        "Case Study",
  "statistics":        "Statistics / Research",
  "industry-analysis": "Industry & Trend Analysis",
};

export interface ArticleTemplate {
  category: ArticleCategory;
  goal: string;
  wordRange: [number, number];
  sections: string[];
  prompt: string;
}

export const TEMPLATES: Record<ArticleCategory, ArticleTemplate> = {
  "definition": {
    category: "definition",
    goal: "Explain what something is clearly and completely",
    wordRange: [1800, 2800],
    sections: [
      "Definition",
      "How It Works",
      "How to Measure It",
      "Example",
      "Common Mistakes",
      "Frequently Asked Questions",
    ],
    prompt: `Write a Definition article. Rules: (1) First sentence of the article must directly answer "what is X" in one sentence. (2) Each section has a UNIQUE job — zero overlap allowed: Definition=scope only, How It Works=mechanism only, Measure=metrics only, Example=one scenario only, Mistakes=named failure modes only, FAQ=follow-up questions only. (3) FAQ section must have 4-5 H3 subsections where each H3 IS the question, answered in 2-3 sentences. (4) Name at least 2 limitations or cases where X does NOT apply. (5) Every factual claim needs a named source or explicit hedge.`,
  },
  "how-it-works": {
    category: "how-it-works",
    goal: "Explain a process or mechanism step by step",
    wordRange: [1000, 2000],
    sections: ["Overview", "Step-by-step Process", "Key Participants", "Example", "Limitations"],
    prompt: `Write a How It Works article. Structure: H1 names the process. Intro gives a one-sentence summary of how it works. Sections: overview, the actual steps/stages with specifics, who or what is involved, concrete example, known limitations. Use numbered lists for sequential steps. No vague filler.`,
  },
  "how-to": {
    category: "how-to",
    goal: "Help the reader complete a specific task",
    wordRange: [1000, 2200],
    sections: ["Prerequisites", "Steps", "Verification", "Common Mistakes"],
    prompt: `Write a How-To Guide. H1 is the task ("How to X"). Intro: confirm what the guide covers, estimated time, prerequisites. Then numbered steps — each step is one action with a checkable result. Add a troubleshooting section for the 2-3 most common mistakes. End with how to verify success.`,
  },
  "troubleshooting": {
    category: "troubleshooting",
    goal: "Help diagnose and fix a specific problem",
    wordRange: [900, 2000],
    sections: ["Symptoms", "Common Causes", "Diagnosis", "Solutions", "Escalation"],
    prompt: `Write a Troubleshooting article. H1: "Why X is happening" or "How to fix X". Sections: symptoms checklist, most common causes with explanations, step-by-step diagnosis, solutions per cause, when to escalate. Be specific — name exact error messages, codes, conditions. No generic advice.`,
  },
  "comparison": {
    category: "comparison",
    goal: "Compare two or more options with clear criteria",
    wordRange: [1200, 2500],
    sections: ["Overview", "Comparison Table", "Detailed Breakdown", "Use Cases", "Verdict"],
    prompt: `Write a Comparison article. H1: "X vs Y — [key differentiator]". Intro: state what the comparison covers and the key difference upfront. Include a comparison table early. Then detailed breakdown per criterion. End with clear use-case guidance: "choose X if..., choose Y if...". Base comparisons on verifiable facts.`,
  },
  "best-options": {
    category: "best-options",
    goal: "Help the reader choose from a ranked list of options",
    wordRange: [1500, 3000],
    sections: ["Selection Criteria", "Top Picks", "Comparison", "How to Choose"],
    prompt: `Write a Best/Top Options article. H1: "Best X for [use case]". State selection methodology upfront — what criteria, how evaluated. For each option: what it is, key strengths, key weaknesses, who it's for, price range. Include comparison table. End with decision guidance. No invented reviews or fake testing claims.`,
  },
  "alternatives": {
    category: "alternatives",
    goal: "Present alternatives to a known product or approach",
    wordRange: [1200, 2500],
    sections: ["Why Look for Alternatives", "Criteria", "Alternatives List", "Comparison"],
    prompt: `Write an Alternatives article. H1: "X Alternatives: [what they offer instead]". Start with why someone might need an alternative (cost, features, limitations). State comparison criteria. For each alternative: key difference from original, strengths, weaknesses, ideal user. Use a comparison table. Be factual about limitations.`,
  },
  "review": {
    category: "review",
    goal: "Evaluate a product or service with evidence",
    wordRange: [1200, 2500],
    sections: ["Overview", "Testing Methodology", "Features", "Pros & Cons", "Verdict"],
    prompt: `Write a Review article. H1: "[Product] Review: [key verdict in a few words]". State what was tested, how, and when. Cover: key features (only real ones), performance findings, pricing, pros and cons. Give a clear verdict with a recommendation. If not personally tested, say so and use only verifiable public information.`,
  },
  "pricing": {
    category: "pricing",
    goal: "Explain what something costs and why",
    wordRange: [800, 1800],
    sections: ["Pricing Overview", "What Affects Cost", "Plans Breakdown", "Hidden Costs", "Value Assessment"],
    prompt: `Write a Pricing article. H1: "How Much Does X Cost". Give the price range immediately. Cover: pricing tiers/plans with specifics, factors that affect cost, hidden fees or conditions, free vs paid comparison if relevant. Include a pricing table. State the source and date for all prices — prices change.`,
  },
  "benefits-risks": {
    category: "benefits-risks",
    goal: "Give a balanced view of benefits and risks",
    wordRange: [900, 1800],
    sections: ["Key Benefits", "Risks & Limitations", "Who Benefits Most", "Who Should Be Cautious"],
    prompt: `Write a Benefits & Risks article. H1 frames the balanced question. Cover real benefits with conditions — not hype. Cover real risks with specifics. Include: who benefits most, who faces the highest risk, when it makes sense vs when it doesn't. No cherry-picking. Every major claim needs a source.`,
  },
  "beginners-guide": {
    category: "beginners-guide",
    goal: "Give a complete introduction for people new to a topic",
    wordRange: [1500, 2800],
    sections: ["What It Is", "Key Terms", "How to Get Started", "Common Mistakes", "Next Steps"],
    prompt: `Write a Beginner's Guide. H1: "Beginner's Guide to X" or "X for Beginners". Assume no prior knowledge. Define every term on first use. Structure: what it is and why it matters, essential concepts, how to get started step by step, mistakes beginners make, where to go next. No jargon without definition.`,
  },
  "checklist": {
    category: "checklist",
    goal: "Give an actionable checklist for completing a task",
    wordRange: [700, 1500],
    sections: ["Checklist", "Each Item Explained", "When to Use"],
    prompt: `Write a Checklist article. H1: "[Task] Checklist". Present the checklist early — readers want to scan it first. Each item: one clear action with a checkable result. Then explain each item briefly in a dedicated section. Add context on when and how to use the checklist. Keep it scannable.`,
  },
  "case-study": {
    category: "case-study",
    goal: "Show a real result with methodology and evidence",
    wordRange: [800, 3000],
    sections: ["Context", "Challenge", "Approach", "Results", "Lessons"],
    prompt: `Write a Case Study article. H1 states the result: "How [Subject] achieved [outcome]". Cover: starting situation, specific challenge, the approach taken (with details), measurable results (with numbers and dates), lessons learned. Every result claim needs a source or must be clearly attributed. No invented metrics.`,
  },
  "statistics": {
    category: "statistics",
    goal: "Present research or data with clear methodology",
    wordRange: [800, 3000],
    sections: ["Key Findings", "Methodology", "Data Breakdown", "Implications", "Limitations"],
    prompt: `Write a Statistics / Research article. H1 states the key finding. Lead with the most important number or insight. Cover: methodology (sample, period, source), full data breakdown, what the data means in practice, limitations of the data. Cite every statistic with source URL and date. Never round numbers without noting it.`,
  },
  "industry-analysis": {
    category: "industry-analysis",
    goal: "Explain trends and changes in an industry",
    wordRange: [1200, 2500],
    sections: ["Current State", "Key Trends", "Drivers", "Implications", "Outlook"],
    prompt: `Write an Industry & Trend Analysis article. H1: "[Industry] in [Year]: [key shift or trend]". Cover: current state with data, confirmed trends (not speculation), what's driving the changes, implications for businesses or users, realistic outlook. Distinguish between confirmed trends and forecasts. Cite sources with dates.`,
  },
};


export function getTemplate(category: ArticleCategory) {
  const t = TEMPLATES[category] ?? TEMPLATES["definition"];
  return {
    ...t,
    mustHaveSections: t.sections,
    h2Count: { min: 4, max: t.sections.length + 2 },
    minWords: t.wordRange[0],
    maxWords: t.wordRange[1],
  };
}
