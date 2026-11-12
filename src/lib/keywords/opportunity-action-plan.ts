import type {
  OpportunityDiagnosis,
} from "./opportunity-diagnosis";

const CREATE_PAGE_THRESHOLD =
  0.35;

const UPDATE_PAGE_THRESHOLD =
  0.7;

export type OpportunityDecision =
  | "CREATE"
  | "UPDATE"
  | "SKIP";

export type ActionPlanStepType =
  | "CREATE_PAGE"
  | "UPDATE_PAGE"
  | "ALIGN_TOPIC"
  | "ADD_EVIDENCE_BACKED_TOPIC"
  | "STRENGTHEN_INTERNAL_LINKS"
  | "MEASURE_OUTCOME";

export interface ActionPlanStep {
  type: ActionPlanStepType;
  title: string;
  explanation: string;
  evidence: string[];
}

export interface OpportunityActionPlan {
  keyword: string;
  market: string;
  decision: OpportunityDecision;

  targetPageUrl:
    string | null;

  rationale: string;

  evidence: string[];

  evidenceBackedTopics: Array<{
    topic: string;
    competitorCoverage: number;
    evidence: string[];
  }>;

  steps: ActionPlanStep[];

  measurement: {
    baselineLiveRank:
      number | null;

    checkpointsDays:
      number[];

    metrics:
      string[];

    rule:
      string;
  };

  observations: {
    competitorPagesFetched:
      number;

    competitorMedianWordCount:
      number | null;

    wordCountRule:
      string;
  };

  guardrails: string[];
}

function hasFinding(
  diagnosis: OpportunityDiagnosis,
  code: string
): boolean {
  return diagnosis.findings.some(
    (
      finding
    ) =>
      finding.code ===
      code
  );
}

function rankEvidence(
  diagnosis: OpportunityDiagnosis
): string {
  return diagnosis.liveRank ===
    null
    ? "The site wasn't found in the top 100 organic results of the latest live check."
    : `Current live position: #${diagnosis.liveRank}.`;
}

export function decideOpportunityAction(
  diagnosis: OpportunityDiagnosis
): OpportunityDecision {
  const relevance =
    diagnosis.ownPage
      ?.relevanceScore ??
    null;

  if (
    relevance ===
      null ||
    relevance <
      CREATE_PAGE_THRESHOLD
  ) {
    return "CREATE";
  }

  if (
    relevance <
      UPDATE_PAGE_THRESHOLD ||
    hasFinding(
      diagnosis,
      "WEAK_QUERY_ALIGNMENT"
    ) ||
    hasFinding(
      diagnosis,
      "CONSENSUS_TOPIC_GAPS"
    ) ||
    hasFinding(
      diagnosis,
      "LOW_INTERNAL_SUPPORT"
    )
  ) {
    return "UPDATE";
  }

  return "SKIP";
}

export function buildOpportunityActionPlan(
  diagnosis: OpportunityDiagnosis
): OpportunityActionPlan {
  const decision =
    decideOpportunityAction(
      diagnosis
    );

  const relevance =
    diagnosis.ownPage
      ?.relevanceScore ??
    null;

  const evidence:
    string[] =
    [
      rankEvidence(
        diagnosis
      ),
    ];

  if (
    diagnosis.ownPage
  ) {
    evidence.push(
      `Best matching page: ${diagnosis.ownPage.url}.`
    );

    if (
      relevance !==
      null
    ) {
      evidence.push(
        `Page match with the search topic: ${Math.round(
          relevance *
            100
        )}%.`
      );
    }

    evidence.push(
      `Title: ${diagnosis.ownPage.title ?? "missing"}.`
    );

    evidence.push(
      `H1: ${diagnosis.ownPage.h1 ?? "missing"}.`
    );
  } else {
    evidence.push(
      "No matching page found on the site."
    );
  }

  evidence.push(
    `Competitor pages read: ${diagnosis.competitorPagesFetched}.`
  );

  const evidenceBackedTopics =
    diagnosis.topicGaps.map(
      (
        gap
      ) => ({
        topic:
          gap.topic,

        competitorCoverage:
          gap.competitorCoverage,

        evidence:
          gap.evidence,
      })
    );

  const steps:
    ActionPlanStep[] =
    [];

  let rationale:
    string;

  let targetPageUrl:
    string | null =
    diagnosis.ownPage
      ?.url ??
    null;

  if (
    decision ===
    "CREATE"
  ) {
    targetPageUrl =
      null;

    rationale =
      diagnosis.ownPage
        ? `The closest existing page matches the topic by only ${Math.round(
            (
              diagnosis.ownPage
                .relevanceScore ??
              0
            ) *
              100
          )}%. Changing it heavily could break its current purpose, so it's safer to create a dedicated page for this search.`
        : "No page on the site clearly answers this search.";

    steps.push({
      type:
        "CREATE_PAGE",

      title:
        `Create a dedicated page for “${diagnosis.keyword}”`,

      explanation:
        "The page should have one clear job and genuinely answer this search. Don't turn a loosely related page into a catch-all SEO page.",

      evidence:
        diagnosis.ownPage
          ? [
              `Current best page: ${diagnosis.ownPage.url}`,
              `Match: ${Math.round(
                (
                  diagnosis.ownPage
                    .relevanceScore ??
                  0
                ) *
                  100
              )}%`,
            ]
          : [
              "No suitable existing page found.",
            ],
    });

    steps.push({
      type:
        "ALIGN_TOPIC",

      title:
        "Make the page topic clear in the Title and H1",

      explanation:
        `The Title and H1 should naturally say the page is about “${diagnosis.keyword}”. Don't repeat the keyword artificially or stuff it.`,

      evidence: [
        `Primary search: ${diagnosis.keyword}`,
        diagnosis.serpPattern,
      ],
    });
  } else if (
    decision ===
    "UPDATE"
  ) {
    rationale =
      "An existing page already targets this search, so there's no need for a new one. Improve the existing page only where gaps are observed.";

    steps.push({
      type:
        "UPDATE_PAGE",

      title:
        "Improve the existing page",

      explanation:
        `Work on ${diagnosis.ownPage?.url ?? "the existing page"} instead of creating a second page with a similar goal.`,

      evidence:
        diagnosis.ownPage
          ? [
              `Topic match: ${Math.round(
                (
                  diagnosis.ownPage
                    .relevanceScore ??
                  0
                ) *
                  100
              )}%`,
            ]
          : [],
    });

    if (
      hasFinding(
        diagnosis,
        "WEAK_QUERY_ALIGNMENT"
      )
    ) {
      steps.push({
        type:
          "ALIGN_TOPIC",

        title:
          "Make the page topic clearer",

        explanation:
          "Refine the Title and H1 only where it truthfully describes the page content.",

        evidence:
          diagnosis.ownPage
            ? [
                `Title: ${diagnosis.ownPage.title ?? "missing"}`,
                `H1: ${diagnosis.ownPage.h1 ?? "missing"}`,
              ]
            : [],
      });
    }
  } else {
    rationale =
      "The existing page already matches the topic well, and current data shows no clear change worth making just for SEO. Keep the page and keep measuring.";

    steps.push({
      type:
        "MEASURE_OUTCOME",

      title:
        "Don't make big changes without new evidence",

      explanation:
        "A low position alone doesn't prove the page needs rewriting. Collect more ranking and Search Console history first.",

      evidence: [
        rankEvidence(
          diagnosis
        ),
      ],
    });
  }

  for (
    const gap of
    evidenceBackedTopics
  ) {
    steps.push({
      type:
        "ADD_EVIDENCE_BACKED_TOPIC",

      title:
        `Check whether “${gap.topic}” is needed`,

      explanation:
        "Add this topic only if it genuinely helps visitors. It appeared on several competitor pages, so it's an evidence-backed opportunity, not a mandatory SEO block.",

      evidence: [
        `Topic found on ${gap.competitorCoverage} competitor pages.`,
        ...gap.evidence,
      ],
    });
  }

  if (
    hasFinding(
      diagnosis,
      "LOW_INTERNAL_SUPPORT"
    )
  ) {
    steps.push({
      type:
        "STRENGTHEN_INTERNAL_LINKS",

      title:
        "Add natural internal links",

      explanation:
        "Link relevant pages to the target page where the link genuinely helps visitors.",

      evidence:
        diagnosis.ownPage
          ? [
              `Internal links to this page found among checked pages: ${diagnosis.ownPage.inboundInternalLinks ?? 0}.`,
            ]
          : [],
    });
  }

  if (
    !steps.some(
      (
        step
      ) =>
        step.type ===
        "MEASURE_OUTCOME"
    )
  ) {
    steps.push({
      type:
        "MEASURE_OUTCOME",

      title:
        "Measure the result after the change",

      explanation:
        "Save a baseline before the change and compare real results after 7, 14, 28, 60 and 90 days. This tracks outcomes; it doesn't promise growth.",

      evidence: [
        rankEvidence(
          diagnosis
        ),
      ],
    });
  }

  return {
    keyword:
      diagnosis.keyword,

    market:
      diagnosis.market,

    decision,

    targetPageUrl,

    rationale,

    evidence,

    evidenceBackedTopics,

    steps,

    measurement: {
      baselineLiveRank:
        diagnosis.liveRank,

      checkpointsDays: [
        7,
        14,
        28,
        60,
        90,
      ],

      metrics: [
        "Live organic rank",
        "GSC impressions when available",
        "GSC clicks when available",
        "GSC CTR when available",
        "GSC average position when available",
      ],

      rule:
        "Record before → action → 7/14/28/60/90 day observations. Do not claim causation from one change without enough evidence.",
    },

    observations: {
      competitorPagesFetched:
        diagnosis.competitorPagesFetched,

      competitorMedianWordCount:
        diagnosis.observedCompetitorMedianWordCount,

      wordCountRule:
        "Competitor word count is descriptive evidence only. Never use it as a required article length.",
    },

    guardrails: [
      "Don't promise #1 or a specific ranking gain.",
      "Don't create a new page if an existing one already clearly serves the same search.",
      "Don't add sections just because one competitor has them.",
      "A consensus topic needs confirmation from several competitor pages.",
      "Don't treat word count or H2/H3 counts as SEO goals.",
      "SKIP is a valid decision when there isn't enough evidence for a change.",
    ],
  };
}
