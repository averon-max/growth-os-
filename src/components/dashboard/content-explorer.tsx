"use client";

import {
  asRecord,
  formatNumber,
  formatMoney,
  keywordScore,
  keywordVolume,
  keywordDifficulty,
  extractTrendPoints,
  trendMetric,
  type KeywordPlan,
  type TrendPoint,
} from "./content-explorer-selectors";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Layers3,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import {
  Badge,
  EmptyState,
} from "./ui";

import uiStyles from "./ui.module.css";

import { ContentGenerationHud } from "./content-generation-hud";
import styles from "./content-intelligence.module.css";


interface OpportunityRow {
  id: string;
  title: string;
  reason: string;
  recommendation: string;
  score: number;
}


interface ArticleRow {
  id: string;
  title: string;
  status: string;
  publishError: string | null;
  metaDescription: string;
  h1: string;
  bodyMarkdown: string;
}


interface BriefRow {
  id: string;
  topic: string;
  primaryKeyword: string;
  searchIntent: string;
  status: string;
  articles: ArticleRow[];
}


interface PlanAction {
  type: string;

  reason?:
    string;

  existingBriefId?:
    string | null;

  existingTopic?:
    string | null;

  similarity?:
    number | null;
}


interface SerpRow {
  rank: number;
  absoluteRank: number | null;
  domain: string;
  url: string;
  title: string;
  description: string | null;
  featuredSnippet: boolean;
}


interface FinalPlan {
  confidence: string;
  targetFormat: string;
  serpAvailable: boolean;

  strategy: {
    searchIntent: string;
    action: PlanAction;
    primary: KeywordPlan;
    secondary: KeywordPlan[];
    supporting: KeywordPlan[];
    excluded: KeywordPlan[];
  };

  benchmark: {
    organicResults: number;
    fetchedPages: number;
    eligiblePages: number;
    observedMedianWordCount: number | null;
    observedMedianH2: number | null;
    observedMedianH3: number | null;
    pageTypeMix: Record<string, number>;
  };

  searchFeatures: {
    aiOverview: boolean;
    peopleAlsoAsk: boolean;
    questions: string[];

    aiOverviewReferences:
      Array<{
        domain: string | null;
        url: string | null;
        title: string | null;
      }>;

    aiOnlyCitationDomains: string[];
  };

  architecture: {
    headingPolicy: {
      h1: 1;
      h2: "AS_NEEDED";
      h3: "ONLY_WHEN_NEEDED";
      maxDepth: 3;
    };

    requiredTopics: string[];
    questionsToAnswer: string[];
    contentGaps: string[];

    directAnswerBeforeFirstH2: boolean;
    toolFirstWhenAvailable: boolean;
  };

  serpSnapshot:
    {
      organic: SerpRow[];
    }
    | null;
}


interface PlanResponse {
  plan?: FinalPlan;
  error?: string;
}


const ARTICLE_STATUS_TONE:
  Record<
    string,
    "success" | "danger" | "warning" | "muted"
  > = {
    GENERATING:
      "warning",

    DRAFT:
      "muted",

    IN_REVIEW:
      "warning",

    APPROVED:
      "success",

    PUBLISHED:
      "success",

    PUBLISH_FAILED:
      "danger",

    REJECTED:
      "danger",
  };


function Sparkline({
  points,
}: {
  points:
    TrendPoint[];
}) {
  if (
    points.length <
    2
  ) {
    return (
      <div
        className={
          styles.noTrend
        }
      >
        No monthly trend series
      </div>
    );
  }

  const width =
    480;

  const height =
    104;

  const values =
    points.map(
      (point) =>
        point.value
    );

  const min =
    Math.min(
      ...values
    );

  const max =
    Math.max(
      ...values
    );

  const range =
    Math.max(
      1,
      max -
      min
    );

  const polyline =
    points
      .map(
        (
          point,
          index
        ) => {
          const x =
            (
              index /
              Math.max(
                1,
                points.length -
                1
              )
            ) *
            width;

          const y =
            height -
            (
              (
                point.value -
                min
              ) /
              range
            ) *
              (
                height -
                14
              ) -
            7;

          return `${x},${y}`;
        }
      )
      .join(
        " "
      );

  return (
    <div
      className={
        styles.sparkWrap
      }
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className={
          styles.spark
        }
        role="img"
        aria-label="12 month search demand"
      >
        <line
          x1="0"
          y1={height - 1}
          x2={width}
          y2={height - 1}
          className={
            styles.sparkAxis
          }
        />

        <polyline
          points={
            polyline
          }
          className={
            styles.sparkLine
          }
        />
      </svg>

      <div
        className={
          styles.sparkLabels
        }
      >
        <span>
          {
            points[0]
              ?.label
          }
        </span>

        <span>
          {
            points[
              points.length -
              1
            ]?.label
          }
        </span>
      </div>
    </div>
  );
}


function Metric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className={
        styles.metric
      }
    >
      <span
        className={
          styles.metricLabel
        }
      >
        {label}
      </span>

      <strong
        className={
          styles.metricValue
        }
      >
        {value}
      </strong>
    </div>
  );
}


function SectionHeader({
  eyebrow,
  title,
  meta,
}: {
  eyebrow:
    string;

  title:
    string;

  meta?:
    string;
}) {
  return (
    <div
      className={
        styles.sectionHeader
      }
    >
      <div>
        <div
          className={
            styles.eyebrow
          }
        >
          {eyebrow}
        </div>

        <div
          className={
            styles.sectionTitle
          }
        >
          {title}
        </div>
      </div>

      {
        meta && (
          <div
            className={
              styles.sectionMeta
            }
          >
            {meta}
          </div>
        )
      }
    </div>
  );
}


function KeywordRows({
  title,
  items,
}: {
  title:
    string;

  items:
    KeywordPlan[];
}) {
  return (
    <div
      className={
        styles.keywordGroup
      }
    >
      <div
        className={
          styles.keywordGroupTitle
        }
      >
        {title}
        <span>
          {
            items.length
          }
        </span>
      </div>

      {
        items.length ===
          0
          ? (
            <div
              className={
                styles.mutedRow
              }
            >
              None
            </div>
          )
          : items
              .slice(
                0,
                12
              )
              .map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.keyword
                    }
                    className={
                      styles.keywordRow
                    }
                  >
                    <span
                      className={
                        styles.keywordName
                      }
                    >
                      {
                        item.keyword
                      }
                    </span>

                    <span>
                      {
                        keywordScore(
                          item
                        ) ===
                        null
                          ? "—"
                          : Math.round(
                              keywordScore(
                                item
                              )!
                            )
                      }
                    </span>

                    <span>
                      {
                        formatNumber(
                          keywordVolume(
                            item
                          )
                        )
                      }
                    </span>

                    <span>
                      {
                        formatNumber(
                          keywordDifficulty(
                            item
                          )
                        )
                      }
                    </span>
                  </div>
                )
              )
      }
    </div>
  );
}


function ArticlePreviewModal({
  article,
  onClose,
}: {
  article:
    ArticleRow;

  onClose:
    () => void;
}) {
  return (
    <div
      className={
        styles.modalBackdrop
      }
      onClick={
        onClose
      }
    >
      <div
        className={
          styles.modal
        }
        onClick={
          (
            event
          ) =>
            event.stopPropagation()
        }
      >
        <div
          className={
            styles.modalHeader
          }
        >
          <div>
            <Badge
              tone={
                ARTICLE_STATUS_TONE[
                  article.status
                ] ??
                "muted"
              }
            >
              {
                article.status
              }
            </Badge>

            <h2>
              {
                article.h1 ||
                article.title
              }
            </h2>

            <p>
              {
                article.metaDescription
              }
            </p>
          </div>

          <button
            type="button"
            className={
              styles.iconButton
            }
            onClick={
              onClose
            }
            aria-label="Close preview"
          >
            <X
              size={
                16
              }
            />
          </button>
        </div>

        {
          article
            .publishError && (
            <div
              className={
                uiStyles.formError
              }
            >
              {
                article.publishError
              }
            </div>
          )
        }

        <div
          className={
            styles.markdown
          }
        >
          {
            article
              .bodyMarkdown
              ? (
                <ReactMarkdown>
                  {
                    article.bodyMarkdown
                  }
                </ReactMarkdown>
              )
              : (
                <p>
                  No content generated yet.
                </p>
              )
          }
        </div>
      </div>
    </div>
  );
}


export function ContentExplorer({
  websiteId,
  opportunities,
}: {
  websiteId:
    string;

  opportunities:
    OpportunityRow[];
}) {
  const [
    briefs,
    setBriefs,
  ] =
    useState<
      BriefRow[] | null
    >(
      null
    );

  const [
    topic,
    setTopic,
  ] =
    useState(
      ""
    );

  const [
    plan,
    setPlan,
  ] =
    useState<
      FinalPlan | null
    >(
      null
    );

  const [
    analyzing,
    setAnalyzing,
  ] =
    useState(
      false
    );

  const [
    creatingBrief,
    setCreatingBrief,
  ] =
    useState(
      false
    );

  const [
    generatingArticleBriefId,
    setGeneratingArticleBriefId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    busyArticleId,
    setBusyArticleId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    notice,
    setNotice,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    previewArticle,
    setPreviewArticle,
  ] =
    useState<
      ArticleRow | null
    >(
      null
    );


  const loadBriefs =
    useCallback(
      async () => {
        const res =
          await fetch(
            `/api/content/briefs?websiteId=${encodeURIComponent(
              websiteId
            )}`
          );

        if (
          res.ok
        ) {
          const data =
            await res.json();

          setBriefs(
            data.items ??
            []
          );
        }
      },
      [
        websiteId,
      ]
    );


  useEffect(
    () => {
      loadBriefs();
    },
    [
      loadBriefs,
    ]
  );


  const analyze =
    useCallback(
      async (
        inputTopic:
          string
      ) => {
        const clean =
          inputTopic.trim();

        if (!clean) {
          setError(
            "Enter a topic or search task."
          );

          return;
        }

        setAnalyzing(
          true
        );

        setError(
          null
        );

        setNotice(
          null
        );

        setPlan(
          null
        );

        try {
          const params =
            new URLSearchParams({
              websiteId,
              topic:
                clean,
            });

          const res =
            await fetch(
              `/api/content/plan?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const data:
            PlanResponse =
              await res.json();

          if (
            !res.ok ||
            !data.plan
          ) {
            setError(
              data.error ??
              "Could not analyze this topic."
            );

            return;
          }

          setTopic(
            clean
          );

          setPlan(
            data.plan
          );
        } catch {
          setError(
            "Network error while building the content plan."
          );
        } finally {
          setAnalyzing(
            false
          );
        }
      },
      [
        websiteId,
      ]
    );


  const onAnalyze =
    async (
      event:
        FormEvent
    ) => {
      event.preventDefault();

      await analyze(
        topic
      );
    };


  const briefedOpportunityTitles =
    useMemo(
      () =>
        new Set(
          (
            briefs ??
            []
          ).map(
            (
              brief
            ) =>
              brief.topic
          )
        ),
      [
        briefs,
      ]
    );


  const createBriefFromPlan =
    async () => {
      if (!plan) {
        return;
      }

      const action =
        plan.strategy
          .action;

      if (
        action.type !==
        "CREATE_NEW"
      ) {
        if (
          action
            .existingBriefId
        ) {
          document
            .getElementById(
              `brief-${action.existingBriefId}`
            )
            ?.scrollIntoView({
              behavior:
                "smooth",

              block:
                "center",
            });

          setNotice(
            "The strategy recommends using existing content instead of creating another competing brief."
          );

          return;
        }

        setNotice(
          "The strategy recommends updating or merging existing content instead of creating a new URL."
        );

        return;
      }

      setCreatingBrief(
        true
      );

      setError(
        null
      );

      setNotice(
        null
      );

      try {
        const primary =
          plan.strategy
            .primary
            .keyword;

        const res =
          await fetch(
            "/api/content/briefs",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  websiteId,

                  /*
                   * This path already has an analyzed winner from
                   * Content Intelligence. Do not select a second
                   * keyword after the user accepts that plan.
                   */
                  topic:
                    primary,

                  generationMode:
                    "EXACT_KEYWORD",

                  exactKeyword:
                    primary,

                  reason:
                    "Content Intelligence selected this primary keyword after keyword, intent, cannibalization and live SERP analysis.",

                  recommendation:
                    `Follow the analyzed Content Intelligence plan. Primary keyword: "${primary}". Target format: ${plan.targetFormat}. Search intent: ${plan.strategy.searchIntent}. Use dynamic semantic headings only when the subject requires them.`,
                }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setError(
            data.error ??
            "Failed to create brief."
          );

          return;
        }

        await loadBriefs();

        setNotice(
          "Brief created from the analyzed content plan."
        );
      } catch {
        setError(
          "Network error while creating the brief."
        );
      } finally {
        setCreatingBrief(
          false
        );
      }
    };


  const approveArticle =
    async (
      articleId:
        string
    ) => {
      setBusyArticleId(
        articleId
      );

      setError(
        null
      );

      try {
        const res =
          await fetch(
            `/api/content/articles/${articleId}/approve`,
            {
              method:
                "POST",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setError(
            data.error ??
            "Failed to approve article."
          );

          return;
        }

        await loadBriefs();
      } catch {
        setError(
          "Network error."
        );
      } finally {
        setBusyArticleId(
          null
        );
      }
    };


  const publishArticle =
    async (
      articleId:
        string
    ) => {
      setBusyArticleId(
        articleId
      );

      setError(
        null
      );

      try {
        const res =
          await fetch(
            `/api/content/articles/${articleId}/publish`,
            {
              method:
                "POST",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setError(
            data.error ??
            "Failed to publish article."
          );

          return;
        }

        await loadBriefs();
      } catch {
        setError(
          "Network error."
        );
      } finally {
        setBusyArticleId(
          null
        );
      }
    };


  const generateArticle =
    async (
      briefId:
        string
    ) => {
      setGeneratingArticleBriefId(
        briefId
      );

      setError(
        null
      );

      try {
        const res =
          await fetch(
            `/api/content/briefs/${briefId}/generate-article`,
            {
              method:
                "POST",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          setError(
            data.error ??
            "Failed to generate article."
          );

          return;
        }

        await loadBriefs();
      } catch {
        setError(
          "Network error."
        );
      } finally {
        setGeneratingArticleBriefId(
          null
        );
      }
    };


  const primary =
    plan?.strategy
      .primary ??
    null;

  const primaryTrend =
    primary
      ? extractTrendPoints(
          primary
        )
      : [];

  const action =
    plan?.strategy
      .action ??
    null;

  const organic =
    plan
      ?.serpSnapshot
      ?.organic ??
    [];



  /*
   * CONTENT_EXPLORER_GENERATION_HUD_V1
   */
  const activeGenerationBrief =
    generatingArticleBriefId
      ? (
          briefs ??
          []
        ).find(
          (
            brief
          ) =>
            brief.id ===
            generatingArticleBriefId
        ) ??
        null
      : null;

  return (
    <div
      className={
        styles.workspace
      }
    >
      {generatingArticleBriefId ? (
        <ContentGenerationHud
          mode="WRITING"
          topic={
            activeGenerationBrief
              ?.topic ??
            "Generating article"
          }
          primaryKeyword={
            activeGenerationBrief
              ?.primaryKeyword ??
            null
          }
          searchIntent={
            activeGenerationBrief
              ?.searchIntent ??
            null
          }
        />
      ) : null}

      {
        error && (
          <div
            className={
              styles.errorBar
            }
          >
            {error}
          </div>
        )
      }

      {
        notice && (
          <div
            className={
              styles.noticeBar
            }
          >
            <Check
              size={
                13
              }
            />

            {notice}
          </div>
        )
      }

      {
        previewArticle && (
          <ArticlePreviewModal
            article={
              previewArticle
            }
            onClose={
              () =>
                setPreviewArticle(
                  null
                )
            }
          />
        )
      }

      <section
        className={
          styles.commandSection
        }
      >
        <SectionHeader
          eyebrow="Content intelligence"
          title="Analyze a topic"
          meta="Keywords · trends · cannibalization · live SERP"
        />

        <form
          className={
            styles.commandBar
          }
          onSubmit={
            onAnalyze
          }
        >
          <Search
            size={
              15
            }
            className={
              styles.commandIcon
            }
          />

          <input
            value={
              topic
            }
            onChange={
              (
                event
              ) =>
                setTopic(
                  event.target
                    .value
                )
            }
            placeholder="Topic, question, keyword, or content task…"
            className={
              styles.commandInput
            }
          />

          <button
            type="submit"
            className={
              styles.primaryButton
            }
            disabled={
              analyzing ||
              !topic.trim()
            }
          >
            {
              analyzing
                ? (
                  <>
                    <Loader2
                      size={
                        13
                      }
                      className={
                        styles.spin
                      }
                    />

                    Analyzing
                  </>
                )
                : (
                  <>
                    Analyze
                    <ArrowRight
                      size={
                        13
                      }
                    />
                  </>
                )
            }
          </button>
        </form>
      </section>


      {
        plan &&
        primary &&
        action && (
          <>
            <section
              className={
                styles.decisionStrip
              }
            >
              <Metric
                label="Decision"
                value={
                  action.type
                    .replaceAll(
                      "_",
                      " "
                    )
                }
              />

              <Metric
                label="Primary keyword"
                value={
                  primary.keyword
                }
              />

              <Metric
                label="Score"
                value={
                  keywordScore(
                    primary
                  ) ===
                  null
                    ? "—"
                    : String(
                        Math.round(
                          keywordScore(
                            primary
                          )!
                        )
                      )
                }
              />

              <Metric
                label="Intent"
                value={
                  plan.strategy
                    .searchIntent
                }
              />

              <Metric
                label="Format"
                value={
                  plan.targetFormat
                    .replaceAll(
                      "_",
                      " "
                    )
                }
              />

              <Metric
                label="Confidence"
                value={
                  plan.confidence
                }
              />
            </section>


            <div
              className={
                styles.grid
              }
            >
              <section
                className={
                  styles.panel
                }
              >
                <SectionHeader
                  eyebrow="Demand"
                  title="12-month search trend"
                  meta={
                    primary.keyword
                  }
                />

                <Sparkline
                  points={
                    primaryTrend
                  }
                />

                <div
                  className={
                    styles.metricGrid
                  }
                >
                  <Metric
                    label="Volume"
                    value={
                      formatNumber(
                        keywordVolume(
                          primary
                        )
                      )
                    }
                  />

                  <Metric
                    label="Difficulty"
                    value={
                      formatNumber(
                        keywordDifficulty(
                          primary
                        )
                      )
                    }
                  />

                  <Metric
                    label="CPC"
                    value={
                      formatMoney(
                        primary.cpc ??
                        null
                      )
                    }
                  />

                  <Metric
                    label="12m avg"
                    value={
                      formatNumber(
                        trendMetric(
                          primary,
                          [
                            "average12m",
                            "avg12m",
                            "twelveMonthAverage",
                          ]
                        )
                      )
                    }
                  />

                  <Metric
                    label="Recent avg"
                    value={
                      formatNumber(
                        trendMetric(
                          primary,
                          [
                            "recent3mAverage",
                            "recentAverage",
                            "avg3m",
                          ]
                        )
                      )
                    }
                  />

                  <Metric
                    label="Momentum"
                    value={
                      (() => {
                        const value =
                          trendMetric(
                            primary,
                            [
                              "momentumPct",
                              "momentum",
                              "recentMomentumPct",
                            ]
                          );

                        return value ===
                          null
                          ? "—"
                          : `${value > 0 ? "+" : ""}${Math.round(
                              value
                            )}%`;
                      })()
                    }
                  />
                </div>
              </section>


              <section
                className={
                  styles.panel
                }
              >
                <SectionHeader
                  eyebrow="Search landscape"
                  title="Google SERP"
                  meta={`${plan.benchmark.organicResults} organic results`}
                />

                <div
                  className={
                    styles.serpFlags
                  }
                >
                  <div>
                    <Bot
                      size={
                        14
                      }
                    />

                    <span>
                      AI Overview
                    </span>

                    <strong
                      data-active={
                        plan.searchFeatures
                          .aiOverview
                      }
                    >
                      {
                        plan.searchFeatures
                          .aiOverview
                          ? "Present"
                          : "Absent"
                      }
                    </strong>
                  </div>

                  <div>
                    <Globe2
                      size={
                        14
                      }
                    />

                    <span>
                      People Also Ask
                    </span>

                    <strong
                      data-active={
                        plan.searchFeatures
                          .peopleAlsoAsk
                      }
                    >
                      {
                        plan.searchFeatures
                          .peopleAlsoAsk
                          ? `${plan.searchFeatures.questions.length} questions`
                          : "Absent"
                      }
                    </strong>
                  </div>

                  <div>
                    <Layers3
                      size={
                        14
                      }
                    />

                    <span>
                      Qualified pages
                    </span>

                    <strong>
                      {
                        plan.benchmark
                          .eligiblePages
                      }
                      /
                      {
                        plan.benchmark
                          .fetchedPages
                      }
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.serpList
                  }
                >
                  {
                    organic
                      .slice(
                        0,
                        10
                      )
                      .map(
                        (
                          row
                        ) => (
                          <a
                            key={`${row.rank}-${row.url}`}
                            href={
                              row.url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className={
                              styles.serpRow
                            }
                          >
                            <span
                              className={
                                styles.serpRank
                              }
                            >
                              #
                              {
                                row.rank
                              }
                            </span>

                            <div
                              className={
                                styles.serpIdentity
                              }
                            >
                              <strong>
                                {
                                  row.title
                                }
                              </strong>

                              <span>
                                {
                                  row.domain
                                }
                              </span>
                            </div>

                            <ExternalLink
                              size={
                                12
                              }
                            />
                          </a>
                        )
                      )
                  }

                  {
                    organic.length ===
                      0 && (
                      <div
                        className={
                          styles.mutedRow
                        }
                      >
                        SERP snapshot unavailable for this plan.
                      </div>
                    )
                  }
                </div>
              </section>


              <section
                className={
                  styles.panel
                }
              >
                <SectionHeader
                  eyebrow="Keyword cluster"
                  title="Semantic targeting"
                  meta="Score · Volume · KD"
                />

                <KeywordRows
                  title="Primary"
                  items={[
                    primary,
                  ]}
                />

                <KeywordRows
                  title="Secondary"
                  items={
                    plan.strategy
                      .secondary
                  }
                />

                <KeywordRows
                  title="Supporting"
                  items={
                    plan.strategy
                      .supporting
                  }
                />

                <KeywordRows
                  title="Excluded"
                  items={
                    plan.strategy
                      .excluded
                  }
                />
              </section>


              <section
                className={
                  styles.panel
                }
              >
                <SectionHeader
                  eyebrow="Information architecture"
                  title="Dynamic structure"
                  meta="No fixed H2/H3 count"
                />

                <div
                  className={
                    styles.headingPolicy
                  }
                >
                  <div>
                    <span>
                      H1
                    </span>

                    <strong>
                      One page-level intent
                    </strong>
                  </div>

                  <div>
                    <span>
                      H2
                    </span>

                    <strong>
                      Distinct major sub-intents only
                    </strong>
                  </div>

                  <div>
                    <span>
                      H3
                    </span>

                    <strong>
                      Only when an H2 needs subdivision
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    styles.observed
                  }
                >
                  <span>
                    Observed competitors
                  </span>

                  <span>
                    median words{" "}
                    <strong>
                      {
                        formatNumber(
                          plan.benchmark
                            .observedMedianWordCount
                        )
                      }
                    </strong>
                  </span>

                  <span>
                    median H2{" "}
                    <strong>
                      {
                        formatNumber(
                          plan.benchmark
                            .observedMedianH2
                        )
                      }
                    </strong>
                  </span>

                  <span>
                    median H3{" "}
                    <strong>
                      {
                        formatNumber(
                          plan.benchmark
                            .observedMedianH3
                        )
                      }
                    </strong>
                  </span>

                  <em>
                    observation only
                  </em>
                </div>

                <div
                  className={
                    styles.topicColumns
                  }
                >
                  <div>
                    <div
                      className={
                        styles.topicTitle
                      }
                    >
                      Required topics
                    </div>

                    {
                      plan.architecture
                        .requiredTopics
                        .length ===
                        0
                        ? (
                          <div
                            className={
                              styles.mutedRow
                            }
                          >
                            No recurring required topics detected.
                          </div>
                        )
                        : plan.architecture
                            .requiredTopics
                            .map(
                              (
                                value
                              ) => (
                                <div
                                  key={
                                    value
                                  }
                                  className={
                                    styles.topicRow
                                  }
                                >
                                  <Check
                                    size={
                                      12
                                    }
                                  />

                                  {
                                    value
                                  }
                                </div>
                              )
                            )
                    }
                  </div>

                  <div>
                    <div
                      className={
                        styles.topicTitle
                      }
                    >
                      Content gaps
                    </div>

                    {
                      plan.architecture
                        .contentGaps
                        .length ===
                        0
                        ? (
                          <div
                            className={
                              styles.mutedRow
                            }
                          >
                            No clear PAA gap detected.
                          </div>
                        )
                        : plan.architecture
                            .contentGaps
                            .map(
                              (
                                value
                              ) => (
                                <div
                                  key={
                                    value
                                  }
                                  className={
                                    styles.gapRow
                                  }
                                >
                                  <Sparkles
                                    size={
                                      12
                                    }
                                  />

                                  {
                                    value
                                  }
                                </div>
                              )
                            )
                    }
                  </div>
                </div>
              </section>
            </div>


            <section
              className={
                styles.executionBar
              }
            >
              <div>
                <span
                  className={
                    styles.executionLabel
                  }
                >
                  Recommended action
                </span>

                <strong>
                  {
                    action.type
                      .replaceAll(
                        "_",
                        " "
                      )
                  }
                </strong>

                {
                  action.reason && (
                    <p>
                      {
                        action.reason
                      }
                    </p>
                  )
                }
              </div>

              <button
                type="button"
                className={
                  styles.primaryButton
                }
                disabled={
                  creatingBrief
                }
                onClick={
                  createBriefFromPlan
                }
              >
                {
                  creatingBrief
                    ? (
                      <>
                        <Loader2
                          size={
                            13
                          }
                          className={
                            styles.spin
                          }
                        />

                        Creating brief
                      </>
                    )
                    : action.type ===
                        "CREATE_NEW"
                      ? (
                        <>
                          Create optimized brief
                          <ArrowRight
                            size={
                              13
                            }
                          />
                        </>
                      )
                      : (
                        <>
                          Use existing content
                          <ArrowRight
                            size={
                              13
                            }
                          />
                        </>
                      )
                }
              </button>
            </section>
          </>
        )
      }


      <section
        className={
          styles.pipeline
        }
      >
        <SectionHeader
          eyebrow="Pipeline"
          title="Content opportunities"
          meta={`${opportunities.length} detected`}
        />

        {
          opportunities.length ===
            0
            ? (
              <EmptyState
                icon={
                  Sparkles
                }
                title="No opportunities yet"
                description="Run an SEO analysis to surface content opportunities."
              />
            )
            : opportunities.map(
                (
                  opportunity
                ) => {
                  const alreadyBriefed =
                    briefedOpportunityTitles.has(
                      opportunity.title
                    );

                  return (
                    <div
                      key={
                        opportunity.id
                      }
                      className={
                        styles.pipelineRow
                      }
                    >
                      <div
                        className={
                          styles.pipelineScore
                        }
                      >
                        {
                          Math.round(
                            opportunity.score
                          )
                        }
                      </div>

                      <div
                        className={
                          styles.pipelineMain
                        }
                      >
                        <strong>
                          {
                            opportunity.title
                          }
                        </strong>

                        <span>
                          {
                            opportunity.reason
                          }
                        </span>
                      </div>

                      {
                        alreadyBriefed
                          ? (
                            <span
                              className={
                                styles.doneLabel
                              }
                            >
                              <Check
                                size={
                                  12
                                }
                              />

                              Brief exists
                            </span>
                          )
                          : (
                            <button
                              type="button"
                              className={
                                styles.textButton
                              }
                              onClick={
                                () => {
                                  setTopic(
                                    opportunity.title
                                  );

                                  void analyze(
                                    opportunity.title
                                  );
                                }
                              }
                            >
                              Analyze
                              <ArrowRight
                                size={
                                  12
                                }
                              />
                            </button>
                          )
                      }
                    </div>
                  );
                }
              )
        }
      </section>


      <section
        className={
          styles.pipeline
        }
      >
        <SectionHeader
          eyebrow="Production"
          title="Briefs & articles"
          meta={`${briefs?.length ?? 0} briefs`}
        />

        {
          !briefs ||
          briefs.length ===
            0
            ? (
              <EmptyState
                icon={
                  FileText
                }
                title="No briefs yet"
                description="Analyze a topic and create a brief when the strategy recommends new content."
              />
            )
            : briefs.map(
                (
                  brief
                ) => {
                  const latestArticle =
                    brief.articles[
                      brief
                        .articles
                        .length -
                      1
                    ];

                  const canGenerate =
                    !latestArticle ||
                    latestArticle.status === "REJECTED" ||
                    latestArticle.status === "BLOCKED_EXTERNAL";

                  return (
                    <div
                      key={
                        brief.id
                      }
                      id={`brief-${brief.id}`}
                      className={
                        styles.briefBlock
                      }
                    >
                      <div
                        className={
                          styles.briefHeader
                        }
                      >
                        <div>
                          <strong>
                            {
                              brief.topic
                            }
                          </strong>

                          <span>
                            {
                              brief.primaryKeyword
                            }
                            {" · "}
                            {
                              brief.searchIntent
                            }
                          </span>
                        </div>

                        {
                          canGenerate && (
                            <button
                              type="button"
                              className={
                                styles.textButton
                              }
                              disabled={
                                generatingArticleBriefId ===
                                brief.id
                              }
                              onClick={
                                () =>
                                  generateArticle(
                                    brief.id
                                  )
                              }
                            >
                              {
                                generatingArticleBriefId ===
                                brief.id
                                  ? "Generating…"
                                  : latestArticle
                                    ? "Retry article"
                                    : "Generate article"
                              }

                              <ArrowRight
                                size={
                                  12
                                }
                              />
                            </button>
                          )
                        }
                      </div>

                      {
                        brief.articles.length ===
                          0
                          ? (
                            <div
                              className={
                                styles.mutedRow
                              }
                            >
                              No article generated yet.
                            </div>
                          )
                          : brief.articles.map(
                              (
                                article
                              ) => (
                                <div
                                  key={
                                    article.id
                                  }
                                  className={
                                    styles.articleRow
                                  }
                                >
                                  <Badge
                                    tone={
                                      ARTICLE_STATUS_TONE[
                                        article.status
                                      ] ??
                                      "muted"
                                    }
                                  >
                                    {
                                      article.status
                                    }
                                  </Badge>

                                  <div
                                    className={
                                      styles.articleIdentity
                                    }
                                  >
                                    <strong>
                                      {
                                        article.title ||
                                        article.h1 ||
                                        "Untitled article"
                                      }
                                    </strong>

                                    {
                                      article.publishError && (
                                        <span
                                          className={
                                            styles.publishError
                                          }
                                        >
                                          {
                                            article.publishError
                                          }
                                        </span>
                                      )
                                    }
                                  </div>

                                  <div
                                    className={
                                      styles.articleActions
                                    }
                                  >
                                    {
                                      article
                                        .bodyMarkdown && (
                                        <button
                                          type="button"
                                          className={
                                            styles.textButton
                                          }
                                          onClick={
                                            () =>
                                              setPreviewArticle(
                                                article
                                              )
                                          }
                                        >
                                          <Eye
                                            size={
                                              12
                                            }
                                          />

                                          Preview
                                        </button>
                                      )
                                    }

                                    {
                                      article.status ===
                                        "DRAFT" && (
                                        <button
                                          type="button"
                                          className={
                                            styles.textButton
                                          }
                                          disabled={
                                            busyArticleId ===
                                            article.id
                                          }
                                          onClick={
                                            () =>
                                              approveArticle(
                                                article.id
                                              )
                                          }
                                        >
                                          Approve
                                        </button>
                                      )
                                    }

                                    {
                                      article.status ===
                                        "APPROVED" && (
                                        <button
                                          type="button"
                                          className={
                                            styles.textButton
                                          }
                                          disabled={
                                            busyArticleId ===
                                            article.id
                                          }
                                          onClick={
                                            () =>
                                              publishArticle(
                                                article.id
                                              )
                                          }
                                        >
                                          Publish
                                        </button>
                                      )
                                    }
                                  </div>
                                </div>
                              )
                            )
                      }
                    </div>
                  );
                }
              )
        }
      </section>
    </div>
  );
}
