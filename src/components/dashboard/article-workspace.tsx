"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Bot,
  Check,
  ChevronRight,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  MousePointerClick,
  Save,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./article-workspace.module.css";

import {
  ArticleStructureStats,
} from "./article-structure-stats";

import {
  detectPersistedArticleEditorialRepetitionV1,
} from "@/lib/content/editorial-repetition-guard-v1";


type ArticleState = {
  id: string;
  websiteId: string;
  title: string;
  metaDescription: string;
  h1: string;
  bodyMarkdown: string;
  status: string;
  publishedUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
  topic: string;
  primaryKeyword: string;
  searchIntent: string;
};

type Analytics = {
  plannedKeywords: {
    primary: string;
    secondary: string[];
  };

  search: {
    scope: string;
    targetUrl: string | null;
    days: number;
    hasData: boolean;

    summary: {
      impressions: number;
      clicks: number;
      ctr: number | null;
      avgPosition: number | null;
      avgImpressionsPerDay: number;
      avgClicksPerDay: number;
      trackedQueries: number;
      top3: number;
      top10: number;
      top20: number;
    };

    previous: {
      impressions: number;
      clicks: number;
      ctr: number | null;
      avgPosition: number | null;
      avgImpressionsPerDay: number;
      avgClicksPerDay: number;
    };

    daily: Array<{
      date: string;
      impressions: number;
      clicks: number;
      avgPosition: number | null;
    }>;

    keywords: Array<{
      keyword: string;
      impressions: number;
      clicks: number;
      ctr: number | null;
      avgPosition: number | null;
      mentions: number;
    }>;
  };

  traffic: {
    scope: "SITE_WIDE";
    note: string;
    hasData: boolean;
    days: number;

    summary: {
      totalRequests: number;
      uniqueVisitors: number;
      verifiedBotRequests: number;
      unverifiedBotRequests: number;
      unclassifiedRequests: number;
      observedDays: number;
      avgRequestsPerObservedDay: number | null;
      avgVisitorsPerObservedDay: number | null;
      avgVerifiedBotsPerObservedDay: number | null;
    };

    previous: {
      totalRequests: number;
      uniqueVisitors: number;
      verifiedBotRequests: number;
      unverifiedBotRequests: number;
      unclassifiedRequests: number;
      observedDays: number;
      avgRequestsPerObservedDay: number | null;
      avgVisitorsPerObservedDay: number | null;
      avgVerifiedBotsPerObservedDay: number | null;
    };

    botGroups: {
      ai: number;
      search: number;
      other: number;
    };

    categories: Array<{
      label: string;
      requests: number;
      group: "AI" | "SEARCH" | "OTHER";
    }>;

    daily: Array<{
      date: string;
      totalRequests: number;
      uniqueVisitors: number;
      verifiedBotRequests: number;
      unclassifiedRequests: number;
    }>;
  };

  queryOutcome: {
    version: string;
    status: string;
    reason: string | null;

    skippedCheckpoints?: Array<{
      checkpoint: string;
      reason: string;
    }>;

    result: {
      checkpoints: Array<{
        checkpoint: string;
        gscSnapshotDate: string;
        mappedQueryCount: number;
        unmappedQueryCount: number;
      }>;

      diagnosis: {
        version: string;
        latestCheckpoint: string | null;
        previousCheckpoint: string | null;

        counts: {
          WINNING: number;
          EMERGING: number;
          STRIKING_DISTANCE: number;
          DECAYING: number;
          LOST: number;
        };

        groups: Array<{
          groupId: string;

          status:
            | "WINNING"
            | "EMERGING"
            | "STRIKING_DISTANCE"
            | "DECAYING"
            | "LOST";

          checkpoint: string;
          intent: string;
          cluster: string;
          subIntent: string;
          queries: string[];
          queryNodeIds: string[];
          sectionHeadings: string[];
          position: number | null;
          previousPosition: number | null;
          impressions: number | null;
          clicks: number | null;
          reason: string;
        }>;

        provenance: {
          observedEvidenceOnly: boolean;
          noCausalInference: boolean;
          noSeoScore: boolean;
          noRankingProbability: boolean;
        };
      };
    } | null;
  };

  outcome: {
    hasData: boolean;

    learningDecision: {
      version: string;

      primaryBottleneck:
        | "INSUFFICIENT_EVIDENCE"
        | "EARLY_OBSERVATION"
        | "SERP_PRESENTATION"
        | "QUERY_GROUP_LOSS"
        | "QUERY_GROUP_DECAY"
        | "SECTION_GAP"
        | "SEARCH_VISIBILITY"
        | "MIXED_SIGNALS"
        | "NONE";

      nextBestAction: string;

      actionScope:
        | "OBSERVATION"
        | "PAGE"
        | "QUERY_GROUP"
        | "SECTION";

      affectedGroupId:
        string | null;

      affectedCluster:
        string | null;

      affectedSubIntent:
        string | null;

      affectedSectionHeadings:
        string[];

      reason:
        string;

      provenance: {
        deterministic: boolean;
        observedEvidenceOnly: boolean;
        noCausalInference: boolean;
        noSeoScore: boolean;
        noRankingProbability: boolean;
        noAutoApply: boolean;
        noNewArticleByDefault: boolean;
      };
    };

    diagnosis: {
      version: string;
      phase: string;
      status: string;
      bottleneck: string;
      nextAction: string;
      latestCheckpoint: string | null;
      observationCount: number;

      trends: {
        rankFromBaseline: string;
        rankSincePrevious: string;
        impressionsFromBaseline: string;
        impressionsSincePrevious: string;
        clicksFromBaseline: string;
        clicksSincePrevious: string;
        ctrFromBaseline: string;
        ctrSincePrevious: string;
        averagePositionFromBaseline: string;
        averagePositionSincePrevious: string;
      };

      provenance: {
        noCausalInference: boolean;
        noSeoScore: boolean;
      };
    } | null;

    observations: Array<{
      checkpoint: string;
      source: string;
      liveRank: number | null;
      liveRankState: string;
      impressions: number | null;
      clicks: number | null;
      ctr: number | null;
      averagePosition: number | null;
      pageUrl: string | null;
      observedAt: string;
    }>;
  };
};

type Heading = {
  id: string;
  level: 1 | 2 | 3;
  text: string;
};

function slugify(
  value:
    string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /[^\p{L}\p{N}\s-]/gu,
      ""
    )
    .replace(
      /\s+/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );
}

function formatNumber(
  value:
    number | null
) {
  if (
    value ===
    null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits:
        1,
    }
  ).format(
    value
  );
}

function shortDate(
  value:
    string
) {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      timeZone:
        "UTC",
    }
  );
}

function statusLabel(
  value:
    string
) {
  return value
    .toLowerCase()
    .replaceAll(
      "_",
      " "
    );
}

function positionMove(
  current:
    number | null,
  previous:
    number | null
) {
  if (
    current ===
      null ||
    previous ===
      null
  ) {
    return null;
  }

  return Math.round(
    (
      previous -
      current
    ) *
      10
  ) /
    10;
}

function deltaText(
  current:
    number,
  previous:
    number
) {
  const delta =
    current -
    previous;

  if (
    delta ===
    0
  ) {
    return "No change";
  }

  return `${delta > 0 ? "+" : ""}${formatNumber(
    delta
  )}`;
}

export function ArticleWorkspace({
  initialArticle,
}: {
  initialArticle:
    ArticleState;
}) {
  const [
    article,
    setArticle,
  ] =
    useState(
      initialArticle
    );

  const [
    draft,
    setDraft,
  ] =
    useState({
      title:
        initialArticle.title,

      metaDescription:
        initialArticle.metaDescription,

      h1:
        initialArticle.h1,

      bodyMarkdown:
        initialArticle.bodyMarkdown,
    });

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    analytics,
    setAnalytics,
  ] =
    useState<
      Analytics | null
    >(null);

  const [
    days,
    setDays,
  ] =
    useState<
      7 | 28 | 90
    >(28);

  const [
    loadingAnalytics,
    setLoadingAnalytics,
  ] =
    useState(true);

  async function loadAnalytics(
    period:
      7 | 28 | 90
  ) {
    setLoadingAnalytics(
      true
    );

    try {
      const response =
        await fetch(
          `/api/content/articles/${article.id}/analytics?days=${period}`,
          {
            cache:
              "no-store",
          }
        );

      const json =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          json.error ??
            "Could not load article analytics."
        );
      }

      setAnalytics(
        json
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not load article analytics."
      );
    } finally {
      setLoadingAnalytics(
        false
      );
    }
  }

  useEffect(
    () => {
      void loadAnalytics(
        days
      );
    },
    [
      days,
      article.id,
      article.publishedUrl,
    ]
  );

  const headings =
    useMemo(
      () => {
        const result:
          Heading[] = [
          {
            id:
              "article-h1",

            level:
              1,

            text:
              draft.h1,
          },
        ];

        const seen =
          new Map<
            string,
            number
          >();

        for (
          const line
          of draft.bodyMarkdown.split(
            "\n"
          )
        ) {
          const match =
            /^(#{1,3})\s+(.+?)\s*$/.exec(
              line.trim()
            );

          if (!match) {
            continue;
          }

          const level =
            match[1]
              .length as
              | 1
              | 2
              | 3;

          const text =
            match[2]
              .replace(
                /[*_`]/g,
                ""
              )
              .trim();

          const base =
            `heading-${slugify(
              text
            )}`;

          const count =
            seen.get(
              base
            ) ??
            0;

          seen.set(
            base,
            count +
              1
          );

          result.push({
            id:
              count
                ? `${base}-${count + 1}`
                : base,

            level,
            text,
          });
        }

        return result;
      },
      [
        draft.h1,
        draft.bodyMarkdown,
      ]
    );

  const structure =
    useMemo(
      () => {
        const h1Count =
          headings.filter(
            (
              heading
            ) =>
              heading.level ===
              1
          ).length;

        const normalized =
          headings.map(
            (
              heading
            ) =>
              heading.text
                .trim()
                .toLowerCase()
          );

        const duplicateCount =
          normalized.length -
          new Set(
            normalized
          ).size;

        let hasH2 =
          false;

        let orphanH3 =
          false;

        for (
          const heading
          of headings
        ) {
          if (
            heading.level ===
            2
          ) {
            hasH2 =
              true;
          }

          if (
            heading.level ===
              3 &&
            !hasH2
          ) {
            orphanH3 =
              true;
          }
        }

        return {
          h1Count,

          h2Count:
            headings.filter(
              (
                heading
              ) =>
                heading.level ===
                2
            ).length,

          h3Count:
            headings.filter(
              (
                heading
              ) =>
                heading.level ===
                3
            ).length,

          duplicateCount,

          orphanH3,

          healthy:
            h1Count ===
              1 &&
            duplicateCount ===
              0 &&
            !orphanH3,
        };
      },
      [
        headings,
      ]
    );

  const positionChange =
    analytics
      ? positionMove(
          analytics.search
            .summary
            .avgPosition,
          analytics.search
            .previous
            .avgPosition
        )
      : null;

  const insights =
    useMemo(
      () => {
        const items:
          string[] = [];

        if (
          structure.healthy
        ) {
          items.push(
            "The article structure is clean and easy to follow."
          );
        }

        if (
          structure.h1Count !==
          1
        ) {
          items.push(
            `The article should have exactly one H1. It currently has ${structure.h1Count}.`
          );
        }

        if (
          structure.duplicateCount >
          0
        ) {
          items.push(
            "Some headings repeat. Clearer section names would make the page easier to scan."
          );
        }

        if (
          structure.orphanH3
        ) {
          items.push(
            "At least one H3 appears before an H2. Move it under a main section."
          );
        }

        if (
          !analytics
        ) {
          return items;
        }

        if (
          !analytics.search
            .hasData
        ) {
          items.push(
            article.publishedUrl
              ? "Google has not shown enough page-level search data for this article yet."
              : "Search performance will appear after this article is published and Google reports page-level data."
          );
        } else {
          const position =
            analytics.search
              .summary
              .avgPosition;

          if (
            position !==
              null &&
            position >
              10 &&
            position <=
              20
          ) {
            items.push(
              `This page is close to the first page of Google, averaging around position ${formatNumber(
                position
              )}.`
            );
          }

          if (
            analytics.search
              .summary
              .trackedQueries >
            0
          ) {
            items.push(
              `Google is showing this page for ${analytics.search.summary.trackedQueries} tracked search ${analytics.search.summary.trackedQueries === 1 ? "query" : "queries"}.`
            );
          }

          if (
            positionChange !==
              null &&
            positionChange >
              0
          ) {
            items.push(
              `Average Google position moved closer to the top by ${formatNumber(
                positionChange
              )} positions compared with the previous period.`
            );
          }
        }

        if (
          analytics.traffic
            .hasData
        ) {
          items.push(
            "Site traffic and bot activity are available as context. They are not yet attributed to this individual article."
          );
        }

        return items;
      },
      [
        analytics,
        article.publishedUrl,
        positionChange,
        structure,
      ]
    );

  async function saveArticle() {
    setBusy(
      "save"
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/content/articles/${article.id}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                draft
              ),
          }
        );

      const json =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          json.error ??
            "Could not save the article."
        );
      }

      setArticle(
        (
          current
        ) => ({
          ...current,
          ...json.article,
        })
      );

      setEditing(
        false
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : "Could not save the article."
      );
    } finally {
      setBusy(
        null
      );
    }
  }

  async function recoverResearch(){
    if(busy!==null||article.status!=="IN_REVIEW"||editing)return;
    const accepted=window.confirm(
      "Run source-first research recovery for THIS EXISTING article? "+
      "This can use paid search and AI. It may re-write all under-researched "+
      "sections, run the full nine critics and SERP Replay. "+
      "Up to 1 planning call, 4 semantic-evidence batches and "+
      "30 Writer/critic/replay model calls (provider retries may add requests). "+
      "Nothing is saved unless all gates pass. No new article is created."
    );
    if(!accepted)return;
    setBusy("research-recovery");
    setError(null);
    try{
      const response=await fetch(
        "/api/content/articles/"+encodeURIComponent(article.id)+
        "/recover-research",
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            expectedUpdatedAt:article.updatedAt,
            authorizePaidResearchRecovery:true,
          }),
        }
      );
      const result=await response.json();
      if(!response.ok){
        throw new Error(
          typeof result?.error==="string"?result.error:
            "Research recovery was not committed. The original article remains unchanged."
        );
      }
      window.location.reload();
    }catch(cause){
      setError(cause instanceof Error?cause.message:
        "Research recovery failed. Existing article and sources were preserved.");
    }finally{
      setBusy(null);
    }
  }

  async function repairEditorial(){
    if(busy!==null||article.status!=="IN_REVIEW"||editing)return;
    const accepted=window.confirm(
      "Repair repeated sections using verified saved evidence? "+
      "This uses a limited number of paid AI requests, never re-runs "+
      "Research or the full Writer, and saves only if all checks pass."
    );
    if(!accepted)return;
    setBusy("editorial-repair");
    setError(null);
    try{
      const response=await fetch(
        "/api/content/articles/"+encodeURIComponent(article.id)+
        "/repair-editorial",
        {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            expectedUpdatedAt:article.updatedAt,
            authorizeBoundedPaidRepair:true,
          }),
        }
      );
      const result=await response.json();
      if(!response.ok){
        throw new Error(
          typeof result?.error==="string"
            ? result.error
            : "Editorial repair did not complete. The original article is unchanged."
        );
      }
      // The new persisted article is bound to a real replay artifact
      // and current Evidence. Reload exact committed state from server.
      window.location.reload();
    }catch(cause){
      setError(cause instanceof Error?cause.message:
        "Editorial repair failed. Original article was preserved.");
    }finally{
      setBusy(null);
    }
  }

  async function articleAction(
    action:
      "approve" |
      "publish"
  ) {
    setBusy(
      action
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/content/articles/${article.id}/${action}`,
          {
            method:
              "POST",
          }
        );

      const json =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          json.error ??
            `Could not ${action} the article.`
        );
      }

      setArticle(
        (
          current
        ) => ({
          ...current,
          ...json.article,
        })
      );

      await loadAnalytics(
        days
      );
    } catch (
      cause
    ) {
      setError(
        cause instanceof
          Error
          ? cause.message
          : `Could not ${action} the article.`
      );
    } finally {
      setBusy(
        null
      );
    }
  }

  function scrollToHeading(
    id:
      string
  ) {
    document
      .getElementById(
        id
      )
      ?.scrollIntoView({
        behavior:
          "smooth",

        block:
          "start",
      });
  }


  const keywordIntelligence =
    useMemo(
      () => {
        const rows =
          analytics?.search
            .keywords ?? [];

        const rankingRows =
          rows.filter(
            (row) =>
              row.impressions > 0 ||
              row.clicks > 0 ||
              (
                row.avgPosition !== null &&
                row.avgPosition <= 100
              )
          );

        const usedRows =
          rankingRows.filter(
            (row) =>
              row.mentions > 0
          );

        const unusedRows =
          rankingRows
            .filter(
              (row) =>
                row.impressions > 0 &&
                row.mentions === 0
            )
            .sort(
              (a, b) =>
                b.impressions -
                a.impressions
            );

        const top100 =
          rankingRows.filter(
            (row) =>
              row.avgPosition !== null &&
              row.avgPosition <= 100
          ).length;

        const coveragePct =
          rankingRows.length > 0
            ? Math.round(
                (
                  usedRows.length /
                  rankingRows.length
                ) *
                  100
              )
            : null;

        const totalMentions =
          rankingRows.reduce(
            (
              total,
              row
            ) =>
              total +
              row.mentions,
            0
          );

        return {
          rows:
            rankingRows,

          rankingKeywords:
            rankingRows.length,

          usedKeywords:
            usedRows.length,

          unusedKeywords:
            unusedRows.length,

          top100,

          coveragePct,

          totalMentions,

          opportunities:
            unusedRows.slice(
              0,
              8
            ),
        };
      },
      [
        analytics,
      ]
    );


  const plannedKeywordIntelligence =
    useMemo(
      () => {
        const rawKeywords = [
          analytics
            ?.plannedKeywords
            .primary ??
            "",

          ...(
            analytics
              ?.plannedKeywords
              .secondary ??
            []
          ),
        ];

        const normalizedText =
          `${article.title}
${article.h1}
${article.bodyMarkdown}`
            .toLowerCase()
            .replace(
              /[^\p{L}\p{N}]+/gu,
              " "
            )
            .replace(
              /\s+/g,
              " "
            )
            .trim();

        const paddedText =
          ` ${normalizedText} `;

        const seen =
          new Set<string>();

        const items =
          rawKeywords
            .map(
              (
                keyword,
                index
              ) => ({
                keyword:
                  keyword.trim(),

                role:
                  index === 0
                    ? "Primary"
                    : "Secondary",
              })
            )
            .filter(
              (
                item
              ) =>
                item.keyword.length >
                0
            )
            .filter(
              (
                item
              ) => {
                const key =
                  item.keyword
                    .toLowerCase()
                    .replace(
                      /[^\p{L}\p{N}]+/gu,
                      " "
                    )
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .trim();

                if (
                  !key ||
                  seen.has(
                    key
                  )
                ) {
                  return false;
                }

                seen.add(
                  key
                );

                return true;
              }
            )
            .map(
              (
                item
              ) => {
                const normalizedKeyword =
                  item.keyword
                    .toLowerCase()
                    .replace(
                      /[^\p{L}\p{N}]+/gu,
                      " "
                    )
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .trim();

                const needle =
                  ` ${normalizedKeyword} `;

                const mentions =
                  normalizedKeyword
                    ? Math.max(
                        0,
                        paddedText
                          .split(
                            needle
                          )
                          .length -
                          1
                      )
                    : 0;

                return {
                  ...item,

                  mentions,

                  used:
                    mentions >
                    0,
                };
              }
            );

        const used =
          items.filter(
            (
              item
            ) =>
              item.used
          ).length;

        const missing =
          items.length -
          used;

        const coveragePct =
          items.length >
          0
            ? Math.round(
                (
                  used /
                  items.length
                ) *
                  100
              )
            : null;

        return {
          items,

          total:
            items.length,

          used,

          missing,

          coveragePct,
        };
      },
      [
        analytics,
        article.title,
        article.h1,
        article.bodyMarkdown,
      ]
    );

  // PLANNED_KEYWORD_INTELLIGENCE_V1

  // KEYWORD_INTELLIGENCE_V2

  return (
    <div>
      <div
        className={
          styles.articleHeader
        }
      >
        <div
          className={
            styles.titleBlock
          }
        >
          <div
            className={
              styles.titleLine
            }
          >
            <h1>
              {article.title}
            </h1>

            <span
              className={
                styles.status
              }
              data-status={
                article.status
              }
            >
              {statusLabel(
                article.status
              )}
            </span>
          </div>

          <div
            className={
              styles.headerMeta
            }
          >
            <span>
              Primary
              keyword:
              {" "}
              <strong>
                {article.primaryKeyword}
              </strong>
            </span>

            <span>
              Intent:
              {" "}
              {statusLabel(
                article.searchIntent
              )}
            </span>

            {article.publishedUrl ? (
              <a
                href={
                  article.publishedUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Open published page
                <ExternalLink
                  size={11}
                />
              </a>
            ) : null}
          </div>
        </div>

        <div
          className={
            styles.headerActions
          }
        >
          <button
            type="button"
            className={
              styles.secondaryButton
            }
            onClick={() =>
              setEditing(
                (
                  value
                ) =>
                  !value
              )
            }
          >
            {editing ? (
              <>
                <Eye
                  size={12}
                />
                Preview
              </>
            ) : (
              <>
                <Edit3
                  size={12}
                />
                Edit
              </>
            )}
          </button>

          {editing ? (
            <button
              type="button"
              className={
                styles.primaryButton
              }
              disabled={
                busy !==
                null
              }
              onClick={
                saveArticle
              }
            >
              <Save
                size={12}
              />

              {busy ===
              "save"
                ? "Saving…"
                : "Save"}
            </button>
          ) : null}

          {article.status==="IN_REVIEW"&&!editing &&
            detectPersistedArticleEditorialRepetitionV1(
              article.bodyMarkdown).length>0 ? (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy!==null}
              title="Recover missing factual support and rebuild this same article"
              onClick={()=>void recoverResearch()}
            >
              <Sparkles size={12}/>
              {busy==="research-recovery"?"Researching & verifying…":
                "Recover research"}
            </button>
          ) : null}

          {article.status==="IN_REVIEW"&&!editing &&
            detectPersistedArticleEditorialRepetitionV1(
              article.bodyMarkdown).length>0 ? (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={busy!==null}
              onClick={()=>void repairEditorial()}
            >
              <Sparkles size={12}/>
              {busy==="editorial-repair"?"Repairing & verifying…":
                "Repair article"}
            </button>
          ) : null}

          {(article.status ===
            "DRAFT" ||
            article.status ===
              "IN_REVIEW") &&
          !editing ? (
            <button
              type="button"
              className={
                styles.primaryButton
              }
              disabled={
                busy !== null ||
                detectPersistedArticleEditorialRepetitionV1(
                  article.bodyMarkdown
                ).length > 0
              }
              title={
                detectPersistedArticleEditorialRepetitionV1(
                  article.bodyMarkdown
                ).length > 0
                  ? "Resolve repeated low-information sections before approval"
                  : "Approve verified article"
              }
              onClick={() =>
                void articleAction(
                  "approve"
                )
              }
            >
              <Check
                size={12}
              />

              {busy ===
              "approve"
                ? "Checking…"
                : "Approve"}
            </button>
          ) : null}

          {article.status ===
            "APPROVED" &&
          !editing ? (
            <button
              type="button"
              className={
                styles.primaryButton
              }
              disabled={
                busy !==
                null
              }
              onClick={() =>
                void articleAction(
                  "publish"
                )
              }
            >
              <Sparkles
                size={12}
              />

              {busy ===
              "publish"
                ? "Publishing…"
                : "Publish"}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          className={
            styles.error
          }
        >
          {error}
        </div>
      ) : null}

      <div
        className={
          styles.editorGrid
        }
      >
        <main
          className={
            styles.document
          }
        >
          {editing ? (
            <div
              className={
                styles.editForm
              }
            >
              <label>
                SEO title

                <input
                  value={
                    draft.title
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        title:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                Meta
                description

                <textarea
                  className={
                    styles.metaInput
                  }
                  value={
                    draft.metaDescription
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        metaDescription:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                H1

                <input
                  value={
                    draft.h1
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        h1:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                Article

                <textarea
                  className={
                    styles.bodyEditor
                  }
                  value={
                    draft.bodyMarkdown
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        bodyMarkdown:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>
            </div>
          ) : (
            <article
              className={
                styles.preview
              }
            >
              <div
                className={
                  styles.seoTitle
                }
              >
                {article.title}
              </div>

              <h1
                id="article-h1"
              >
                {draft.h1}
              </h1>

              <ReactMarkdown
                components={{
                  h1: ({
                    children,
                  }) => (
                    <h1
                      id={`heading-${slugify(
                        String(
                          children
                        )
                      )}`}
                    >
                      {children}
                    </h1>
                  ),

                  h2: ({
                    children,
                  }) => (
                    <h2
                      id={`heading-${slugify(
                        String(
                          children
                        )
                      )}`}
                    >
                      {children}
                    </h2>
                  ),

                  h3: ({
                    children,
                  }) => (
                    <h3
                      id={`heading-${slugify(
                        String(
                          children
                        )
                      )}`}
                    >
                      {children}
                    </h3>
                  ),
                }}
              >
                {draft.bodyMarkdown}
              </ReactMarkdown>
            </article>
          )}
        </main>

        <aside
          className={
            styles.outline
          }
        >
          <div
            className={
              styles.sideSection
            }
          >
            <div
              className={
                styles.sideTitle
              }
            >
              Structure
            </div>

            <div
              className={
                styles.outlineList
              }
            >
              {headings.map(
                (
                  heading,
                  index
                ) => (
                  <button
                    key={`${heading.id}-${index}`}
                    type="button"
                    className={
                      styles.outlineItem
                    }
                    data-level={
                      heading.level
                    }
                    onClick={() =>
                      scrollToHeading(
                        heading.id
                      )
                    }
                  >
                    <span>
                      H{heading.level}
                    </span>

                    <strong>
                      {heading.text}
                    </strong>

                    <ChevronRight
                      size={10}
                    />
                  </button>
                )
              )}
            </div>
          </div>

          <div
            className={
              styles.sideSection
            }
          >
            <div
              className={
                styles.sideTitle
              }
            >
              Structure
              health
            </div>

            <div
              className={
                styles.healthRows
              }
            >
              <div>
                <span>
                  H1
                </span>
                <strong>
                  {structure.h1Count}
                </strong>
              </div>

              <div>
                <span>
                  H2
                </span>
                <strong>
                  {structure.h2Count}
                </strong>
              </div>

              <div>
                <span>
                  H3
                </span>
                <strong>
                  {structure.h3Count}
                </strong>
              </div>

              <div>
                <span>
                  Duplicate
                  headings
                </span>
                <strong>
                  {structure.duplicateCount}
                </strong>
              </div>

              <div>
                <span>
                  Orphan H3
                </span>
                <strong>
                  {structure.orphanH3
                    ? "Yes"
                    : "No"}
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section
        className={
          styles.analysis
        }
      >
        <div
          className={
            styles.sectionHeading
          }
        >
          <div>
            <span>
              Article
              analysis
            </span>

            <strong>
              What Growth OS
              sees
            </strong>
          </div>
        </div>

        <div
          className={
            styles.insights
          }
        >
          {insights.map(
            (
              insight,
              index
            ) => (
              <div
                key={`${insight}-${index}`}
                className={
                  styles.insight
                }
              >
                <Check
                  size={12}
                />

                <span>
                  {insight}
                </span>
              </div>
            )
          )}

          {!insights.length ? (
            <div
              className={
                styles.mutedPanel
              }
            >
              No analysis
              available yet.
            </div>
          ) : null}
        </div>
      </section>

      <section
        className={
          styles.analyticsSection
        }
      >
        <div
          className={
            styles.analyticsHeader
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Search
              performance
            </span>

            <h2>
              How Google
              sees this page
            </h2>
          </div>

          <div
            className={
              styles.range
            }
          >
            {(
              [
                7,
                28,
                90,
              ] as const
            ).map(
              (
                value
              ) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  data-active={
                    days ===
                    value
                  }
                  onClick={() =>
                    setDays(
                      value
                    )
                  }
                >
                  {value}d
                </button>
              )
            )}
          </div>
        </div>

        {loadingAnalytics ? (
          <div
            className={
              styles.loading
            }
          >
            Loading real
            search data…
          </div>
        ) : analytics?.search
            .hasData ? (
          <>
            <div
              className={
                styles.metricGrid
              }
            >
              <Metric
                icon={
                  Activity
                }
                label="Impressions"
                value={formatNumber(
                  analytics.search
                    .summary
                    .impressions
                )}
                detail={deltaText(
                  analytics.search
                    .summary
                    .impressions,
                  analytics.search
                    .previous
                    .impressions
                )}
              />

              <Metric
                icon={
                  MousePointerClick
                }
                label="Clicks"
                value={formatNumber(
                  analytics.search
                    .summary
                    .clicks
                )}
                detail={deltaText(
                  analytics.search
                    .summary
                    .clicks,
                  analytics.search
                    .previous
                    .clicks
                )}
              />

              <Metric
                icon={
                  Search
                }
                label="CTR"
                value={
                  analytics.search
                    .summary
                    .ctr ===
                  null
                    ? "—"
                    : `${formatNumber(
                        analytics.search
                          .summary
                          .ctr
                      )}%`
                }
                detail="From recorded impressions"
              />

              <Metric
                icon={
                  TrendingUp
                }
                label="Average position"
                value={formatNumber(
                  analytics.search
                    .summary
                    .avgPosition
                )}
                detail={
                  positionChange ===
                  null
                    ? "No comparison yet"
                    : positionChange >
                        0
                      ? `${formatNumber(
                          positionChange
                        )} positions closer to the top`
                      : positionChange <
                          0
                        ? `${formatNumber(
                            Math.abs(
                              positionChange
                            )
                          )} positions lower`
                        : "No change"
                }
              />

              <Metric
                icon={
                  FileText
                }
                label="Tracked queries"
                value={formatNumber(
                  analytics.search
                    .summary
                    .trackedQueries
                )}
                detail={`${analytics.search.summary.top10} in top 10 · ${analytics.search.summary.top20} in top 20`}
              />

              <Metric
                icon={
                  Activity
                }
                label="Avg impressions / day"
                value={formatNumber(
                  analytics.search
                    .summary
                    .avgImpressionsPerDay
                )}
                detail={`${days}-day average`}
              />
            </div>

            <div
              className={
                styles.chartCard
              }
            >
              <div
                className={
                  styles.chartHeader
                }
              >
                <strong>
                  Impressions
                </strong>

                <span>
                  Page-level
                  Google data
                </span>
              </div>

              <div
                className={
                  styles.chart
                }
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={
                      analytics.search
                        .daily
                    }
                    margin={{
                      top:
                        8,
                      right:
                        8,
                      bottom:
                        0,
                      left:
                        -20,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="impressionsFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6974d8"
                          stopOpacity={0.24}
                        />

                        <stop
                          offset="100%"
                          stopColor="#6974d8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={
                        false
                      }
                      stroke="#202327"
                    />

                    <XAxis
                      dataKey="date"
                      tickFormatter={
                        shortDate
                      }
                      tick={{
                        fill:
                          "#5f656d",
                        fontSize:
                          9,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <YAxis
                      allowDecimals={
                        false
                      }
                      tick={{
                        fill:
                          "#5f656d",
                        fontSize:
                          9,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <Tooltip
                      labelFormatter={
                        (
                          value
                        ) =>
                          shortDate(
                            String(
                              value
                            )
                          )
                      }
                      contentStyle={{
                        background:
                          "#111315",
                        border:
                          "1px solid #30343a",
                        borderRadius:
                          5,
                        fontSize:
                          10,
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="impressions"
                      stroke="#7983de"
                      fill="url(#impressionsFill)"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className={
                styles.keywordBlock
              }
            >
              <div
                className={
                  styles.tableHeader
                }
              >
                <div>
                  <strong>
                    Search
                    queries
                  </strong>

                  <span>
                    Real
                    queries
                    reported
                    for this
                    page
                  </span>
                </div>
              </div>

              <div
                className={
                  styles.keywordTable
                }
              >
                <div
                  className={
                    styles.keywordHead
                  }
                >
                  <span>
                    Query
                  </span>
                  <span>
                    Impr.
                  </span>
                  <span>
                    Clicks
                  </span>
                  <span>
                    CTR
                  </span>
                  <span>
                    Position
                  </span>
                  <span>
                    In article
                  </span>
                </div>

                {analytics.search
                  .keywords
                  .slice(
                    0,
                    30
                  )
                  .map(
                    (
                      keyword
                    ) => (
                      <div
                        key={
                          keyword.keyword
                        }
                        className={
                          styles.keywordRow
                        }
                      >
                        <strong>
                          {keyword.keyword}
                        </strong>

                        <span>
                          {formatNumber(
                            keyword.impressions
                          )}
                        </span>

                        <span>
                          {formatNumber(
                            keyword.clicks
                          )}
                        </span>

                        <span>
                          {keyword.ctr ===
                          null
                            ? "—"
                            : `${formatNumber(
                                keyword.ctr
                              )}%`}
                        </span>

                        <span>
                          {formatNumber(
                            keyword.avgPosition
                          )}
                        </span>

                        <span>
                          {keyword.mentions}
                          ×
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>
          </>
        ) : (
          <div
            className={
              styles.noData
            }
          >
            <Search
              size={16}
            />

            <div>
              <strong>
                Not enough
                page-level
                search data
                yet
              </strong>

              <span>
                {article.publishedUrl
                  ? "Google has not reported query data for this page in the selected period."
                  : "Publish this article first. Search performance will appear only when Google reports data for its URL."}
              </span>
            </div>
          </div>
        )}
      </section>


      {/* ARTICLE_STRUCTURE_STATS_SIDEBAR_BLUE_V1 */}
      <ArticleStructureStats
        status={article.status}
        title={
          draft.title
        }
        h1={
          draft.h1
        }
        bodyMarkdown={
          draft.bodyMarkdown
        }
        keywords={
          plannedKeywordIntelligence
            .items
            .map(
              (
                item
              ) =>
                item.keyword
            )
        }
      />

      {/* ARTICLE_KEYWORD_INTELLIGENCE_UI_V2 */}
      <section
        className={
          styles.analyticsSection
        }
      >
        <div
          className={
            styles.analyticsHeader
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Keyword intelligence
            </span>

            <h2>
              How this article covers search demand
            </h2>
          </div>

          <span
            className={
              styles.scopePill
            }
          >
            Page-level
          </span>
        </div>

        <div
          className={
            styles.metricGrid
          }
        >
          <Metric
            icon={
              FileText
            }
            label="Planned keywords"
            value={
              formatNumber(
                plannedKeywordIntelligence
                  .total
              )
            }
            detail="Primary + secondary keywords from the content brief"
          />

          <Metric
            icon={
              Check
            }
            label="Used planned"
            value={
              formatNumber(
                plannedKeywordIntelligence
                  .used
              )
            }
            detail="Planned phrases explicitly present in the article"
          />

          <Metric
            icon={
              Search
            }
            label="Missing planned"
            value={
              formatNumber(
                plannedKeywordIntelligence
                  .missing
              )
            }
            detail="Planned phrases with no exact article mention"
          />

          <Metric
            icon={
              Activity
            }
            label="Plan coverage"
            value={
              plannedKeywordIntelligence
                .coveragePct ===
              null
                ? "—"
                : `${plannedKeywordIntelligence.coveragePct}%`
            }
            detail="Exact phrase coverage of the brief plan"
          />

          <Metric
            icon={
              Search
            }
            label="Ranking queries"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    keywordIntelligence
                      .rankingKeywords
                  )
                : "—"
            }
            detail="Queries with real Google visibility"
          />

          <Metric
            icon={
              FileText
            }
            label="Used in article"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    keywordIntelligence
                      .usedKeywords
                  )
                : "—"
            }
            detail="Ranking queries mentioned in this article"
          />

          <Metric
            icon={
              Activity
            }
            label="Coverage"
            value={
              keywordIntelligence
                .coveragePct ===
              null
                ? "—"
                : `${keywordIntelligence.coveragePct}%`
            }
            detail="Visible queries explicitly represented"
          />

          <Metric
            icon={
              TrendingUp
            }
            label="Missing opportunities"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    keywordIntelligence
                      .unusedKeywords
                  )
                : "—"
            }
            detail="Queries with visibility but no exact mention"
          />

          <Metric
            icon={
              Search
            }
            label="Tracked queries"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    analytics.search
                      .summary
                      .trackedQueries
                  )
                : "—"
            }
            detail="Stored page-level search queries"
          />

          <Metric
            icon={
              TrendingUp
            }
            label="Top 3"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    analytics.search
                      .summary
                      .top3
                  )
                : "—"
            }
            detail="Average Google position 1–3"
          />

          <Metric
            icon={
              TrendingUp
            }
            label="Top 10"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    analytics.search
                      .summary
                      .top10
                  )
                : "—"
            }
            detail="Average Google position 1–10"
          />

          <Metric
            icon={
              TrendingUp
            }
            label="Top 20"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    analytics.search
                      .summary
                      .top20
                  )
                : "—"
            }
            detail="Average Google position 1–20"
          />

          <Metric
            icon={
              Activity
            }
            label="Top 100"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    keywordIntelligence
                      .top100
                  )
                : "—"
            }
            detail="Queries currently inside the first 100"
          />

          <Metric
            icon={
              FileText
            }
            label="Query mentions"
            value={
              analytics?.search
                .hasData
                ? formatNumber(
                    keywordIntelligence
                      .totalMentions
                  )
                : "—"
            }
            detail="Exact ranking-query mentions in the content"
          />
        </div>

        {plannedKeywordIntelligence
          .items.length >
        0 && (
          <div
            className={
              styles.keywordBlock
            }
          >
            <div
              className={
                styles.tableHeader
              }
            >
              <div>
                <strong>
                  Planned keyword coverage
                </strong>

                <span>
                  Keywords selected when Growth OS created the content brief. Usage below is exact-phrase evidence, not a semantic SEO score.
                </span>
              </div>
            </div>

            <div
              className={
                styles.keywordTable
              }
            >
              <div
                className={
                  styles.keywordHead
                }
              >
                <span>
                  Keyword
                </span>

                <span>
                  Role
                </span>

                <span>
                  Mentions
                </span>

                <span>
                  Status
                </span>

                <span>
                  Source
                </span>

                <span>
                  Signal
                </span>
              </div>

              {plannedKeywordIntelligence
                .items
                .map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        `${item.role}:${item.keyword}`
                      }
                      className={
                        styles.keywordRow
                      }
                    >
                      <strong>
                        {item.keyword}
                      </strong>

                      <span>
                        {item.role}
                      </span>

                      <span>
                        {item.mentions}×
                      </span>

                      <span>
                        {item.used
                          ? "Used"
                          : "Missing"}
                      </span>

                      <span>
                        Brief
                      </span>

                      <span>
                        {item.role ===
                        "Primary"
                          ? "Core"
                          : "Supporting"}
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>
        )}

        {keywordIntelligence
          .opportunities.length >
        0 ? (
          <div
            className={
              styles.keywordBlock
            }
          >
            <div
              className={
                styles.tableHeader
              }
            >
              <div>
                <strong>
                  Search opportunities
                </strong>

                <span>
                  Google already shows this page for these queries, but the exact query is not currently used in the article.
                </span>
              </div>
            </div>

            <div
              className={
                styles.keywordTable
              }
            >
              <div
                className={
                  styles.keywordHead
                }
              >
                <span>
                  Query
                </span>

                <span>
                  Impr.
                </span>

                <span>
                  Clicks
                </span>

                <span>
                  Position
                </span>

                <span>
                  In article
                </span>

                <span>
                  Signal
                </span>
              </div>

              {keywordIntelligence
                .opportunities
                .map(
                  (
                    keyword
                  ) => (
                    <div
                      key={
                        `opportunity:${keyword.keyword}`
                      }
                      className={
                        styles.keywordRow
                      }
                    >
                      <strong>
                        {keyword.keyword}
                      </strong>

                      <span>
                        {formatNumber(
                          keyword.impressions
                        )}
                      </span>

                      <span>
                        {formatNumber(
                          keyword.clicks
                        )}
                      </span>

                      <span>
                        {formatNumber(
                          keyword.avgPosition
                        )}
                      </span>

                      <span>
                        0×
                      </span>

                      <span>
                        Review
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>
        ) : analytics?.search
            .hasData ? (
          <div
            className={
              styles.noData
            }
          >
            <Check
              size={16}
            />

            <div>
              <strong>
                No obvious query gaps detected
              </strong>

              <span>
                Every currently visible query in this period appears at least once in the article. This does not mean the topic is fully covered semantically.
              </span>
            </div>
          </div>
        ) : (
          <div
            className={
              styles.noData
            }
          >
            <Search
              size={16}
            />

            <div>
              <strong>
                Keyword intelligence starts after publication
              </strong>

              <span>
                Growth OS will compare real page-level Google queries with the article once Search Console reports impressions for its published URL.
              </span>
            </div>
          </div>
        )}
      </section>

      <section
        className={
          styles.analyticsSection
        }
      >
        <div
          className={
            styles.analyticsHeader
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Traffic &
              crawlers
            </span>

            <h2>
              Site traffic
              context
            </h2>
          </div>

          <span
            className={
              styles.scopePill
            }
          >
            Site-wide
          </span>
        </div>

        {analytics?.traffic
          .hasData ? (
          <>
            <div
              className={
                styles.contextNote
              }
            >
              {
                analytics.traffic
                  .note
              }
            </div>

            <div
              className={
                styles.metricGrid
              }
            >
              <Metric
                icon={
                  Activity
                }
                label="Requests"
                value={formatNumber(
                  analytics.traffic
                    .summary
                    .totalRequests
                )}
                detail={`${formatNumber(
                  analytics.traffic
                    .summary
                    .avgRequestsPerObservedDay
                )} avg / observed day`}
              />

              <Metric
                icon={
                  Users
                }
                label="Unique visitors"
                value={formatNumber(
                  analytics.traffic
                    .summary
                    .uniqueVisitors
                )}
                detail={`${formatNumber(
                  analytics.traffic
                    .summary
                    .avgVisitorsPerObservedDay
                )} avg / observed day`}
              />

              <Metric
                icon={
                  Bot
                }
                label="Verified bots"
                value={formatNumber(
                  analytics.traffic
                    .summary
                    .verifiedBotRequests
                )}
                detail={`${formatNumber(
                  analytics.traffic
                    .summary
                    .avgVerifiedBotsPerObservedDay
                )} avg / observed day`}
              />

              <Metric
                icon={
                  Sparkles
                }
                label="AI crawler category"
                value={formatNumber(
                  analytics.traffic
                    .botGroups
                    .ai
                )}
                detail="Only categories explicitly identified as AI"
              />

              <Metric
                icon={
                  Search
                }
                label="Search crawler category"
                value={formatNumber(
                  analytics.traffic
                    .botGroups
                    .search
                )}
                detail="Reported bot categories"
              />

              <Metric
                icon={
                  Activity
                }
                label="Unclassified requests"
                value={formatNumber(
                  analytics.traffic
                    .summary
                    .unclassifiedRequests
                )}
                detail="Not treated as human traffic"
              />
            </div>

            <div
              className={
                styles.chartCard
              }
            >
              <div
                className={
                  styles.chartHeader
                }
              >
                <strong>
                  Traffic over
                  time
                </strong>

                <span>
                  Website-level
                  Cloudflare
                  data
                </span>
              </div>

              <div
                className={
                  styles.chart
                }
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={
                      analytics.traffic
                        .daily
                    }
                    margin={{
                      top:
                        8,
                      right:
                        8,
                      bottom:
                        0,
                      left:
                        -20,
                    }}
                  >
                    <CartesianGrid
                      vertical={
                        false
                      }
                      stroke="#202327"
                    />

                    <XAxis
                      dataKey="date"
                      tickFormatter={
                        shortDate
                      }
                      tick={{
                        fill:
                          "#5f656d",
                        fontSize:
                          9,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <YAxis
                      tick={{
                        fill:
                          "#5f656d",
                        fontSize:
                          9,
                      }}
                      axisLine={
                        false
                      }
                      tickLine={
                        false
                      }
                    />

                    <Tooltip
                      labelFormatter={
                        (
                          value
                        ) =>
                          shortDate(
                            String(
                              value
                            )
                          )
                      }
                      contentStyle={{
                        background:
                          "#111315",
                        border:
                          "1px solid #30343a",
                        borderRadius:
                          5,
                        fontSize:
                          10,
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="uniqueVisitors"
                      name="Unique visitors"
                      stroke="#8b93e5"
                      dot={
                        false
                      }
                      strokeWidth={1.5}
                    />

                    <Line
                      type="monotone"
                      dataKey="verifiedBotRequests"
                      name="Verified bots"
                      stroke="#6f9b7c"
                      dot={
                        false
                      }
                      strokeWidth={1.25}
                    />

                    <Line
                      type="monotone"
                      dataKey="unclassifiedRequests"
                      name="Unclassified"
                      stroke="#8b8f96"
                      dot={
                        false
                      }
                      strokeWidth={1}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className={
                styles.botBreakdown
              }
            >
              <div
                className={
                  styles.tableHeader
                }
              >
                <div>
                  <strong>
                    Bot
                    breakdown
                  </strong>

                  <span>
                    Cloudflare
                    category
                    names as
                    reported
                  </span>
                </div>
              </div>

              {analytics.traffic
                .categories
                .length ? (
                analytics.traffic
                  .categories
                  .slice(
                    0,
                    20
                  )
                  .map(
                    (
                      category
                    ) => (
                      <div
                        key={
                          category.label
                        }
                        className={
                          styles.botRow
                        }
                      >
                        <div>
                          <span
                            className={
                              styles.botDot
                            }
                            data-group={
                              category.group
                            }
                          />

                          <strong>
                            {category.label}
                          </strong>
                        </div>

                        <span>
                          {formatNumber(
                            category.requests
                          )}
                        </span>
                      </div>
                    )
                  )
              ) : (
                <div
                  className={
                    styles.mutedPanel
                  }
                >
                  No detailed
                  bot categories
                  were stored
                  for this
                  period.
                </div>
              )}

              <div
                className={
                  styles.providerNote
                }
              >
                Provider-level
                names such as
                GPTBot or
                ClaudeBot are
                shown only if
                Cloudflare
                actually
                reports them.
                Growth OS does
                not guess bot
                identity.
              </div>
            </div>
          </>
        ) : (
          <div
            className={
              styles.noData
            }
          >
            <Bot
              size={16}
            />

            <div>
              <strong>
                No Cloudflare
                traffic data
                for this
                period
              </strong>

              <span>
                Growth OS will
                not invent
                human or bot
                traffic when
                the source has
                no data.
              </span>
            </div>
          </div>
        )}
      </section>

      <section
        className={
          styles.analyticsSection
        }
      >
        <div
          className={
            styles.analyticsHeader
          }
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              Outcome
            </span>

            <h2>
              What happened
              after the
              action
            </h2>
          </div>
        </div>

        {analytics?.outcome
          ?.learningDecision ? (
          <div
            className={
              styles.outcomeGrid
            }
          >
            <div
              className={
                styles.outcomeCard
              }
            >
              <span>
                Primary bottleneck
              </span>

              <strong>
                {statusLabel(
                  analytics
                    .outcome
                    .learningDecision
                    .primaryBottleneck
                )}
              </strong>

              <div>
                Scope:{" "}
                {statusLabel(
                  analytics
                    .outcome
                    .learningDecision
                    .actionScope
                )}
              </div>

              {analytics
                .outcome
                .learningDecision
                .affectedCluster ? (
                <div>
                  Cluster:{" "}
                  {
                    analytics
                      .outcome
                      .learningDecision
                      .affectedCluster
                  }
                </div>
              ) : null}

              {analytics
                .outcome
                .learningDecision
                .affectedSectionHeadings
                .length >
              0 ? (
                <div>
                  Section:{" "}
                  {analytics
                    .outcome
                    .learningDecision
                    .affectedSectionHeadings
                    .join(
                      ", "
                    )}
                </div>
              ) : null}
            </div>

            <div
              className={
                styles.outcomeCard
              }
            >
              <span>
                Next best action
              </span>

              <strong>
                {statusLabel(
                  analytics
                    .outcome
                    .learningDecision
                    .nextBestAction
                )}
              </strong>

              <div>
                {
                  analytics
                    .outcome
                    .learningDecision
                    .reason
                    .replaceAll(
                      "_",
                      " "
                    )
                    .toLowerCase()
                }
              </div>

              <div>
                Observed evidence only.
                No causal inference.
                No automatic changes.
              </div>
            </div>
          </div>
        ) : null}

        {analytics?.queryOutcome
          ?.result
          ?.diagnosis
          ?.latestCheckpoint ? (
          <>
            <div
              className={
                styles.outcomeGrid
              }
            >
              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Query outcome groups
                </span>

                <strong>
                  {analytics
                    .queryOutcome
                    .result
                    .diagnosis
                    .latestCheckpoint
                    ?.replaceAll(
                      "_",
                      " "
                    )}
                </strong>

                <div>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .diagnosis
                      .groups
                      .length
                  }{" "}
                  observed groups
                </div>

                <div>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .checkpoints
                      .at(-1)
                      ?.mappedQueryCount ??
                    0
                  }{" "}
                  mapped queries ·{" "}
                  {
                    analytics
                      .queryOutcome
                      .result
                      .checkpoints
                      .at(-1)
                      ?.unmappedQueryCount ??
                    0
                  }{" "}
                  unmapped
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Winning
                </span>

                <strong>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .diagnosis
                      .counts
                      .WINNING
                  }
                </strong>

                <div>
                  Observed Top 10
                  query groups
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Striking distance
                </span>

                <strong>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .diagnosis
                      .counts
                      .STRIKING_DISTANCE
                  }
                </strong>

                <div>
                  Observed positions
                  11–20
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Emerging
                </span>

                <strong>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .diagnosis
                      .counts
                      .EMERGING
                  }
                </strong>

                <div>
                  New or earlier-stage
                  observed groups
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Decaying
                </span>

                <strong>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .diagnosis
                      .counts
                      .DECAYING
                  }
                </strong>

                <div>
                  Worsened observed
                  position bucket
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Lost
                </span>

                <strong>
                  {
                    analytics
                      .queryOutcome
                      .result
                      .diagnosis
                      .counts
                      .LOST
                  }
                </strong>

                <div>
                  Present previously,
                  not observed now
                </div>
              </div>
            </div>

            {analytics
              .queryOutcome
              .result
              .diagnosis
              .groups
              .slice(
                0,
                12
              )
              .map(
                (
                  group
                ) => (
                  <div
                    key={
                      `${group.status}:${group.groupId}`
                    }
                    className={
                      styles.outcomeCard
                    }
                  >
                    <span>
                      {statusLabel(
                        group.status
                      )}
                    </span>

                    <strong>
                      {statusLabel(
                        group.subIntent
                      )}
                    </strong>

                    <div>
                      Position{" "}
                      {formatNumber(
                        group.position
                      )}
                      {group
                        .previousPosition !==
                      null
                        ? ` · previous ${formatNumber(
                            group
                              .previousPosition
                          )}`
                        : ""}
                    </div>

                    <div>
                      Impressions{" "}
                      {formatNumber(
                        group.impressions
                      )}{" "}
                      · Clicks{" "}
                      {formatNumber(
                        group.clicks
                      )}
                    </div>

                    {group
                      .sectionHeadings
                      .length >
                    0 ? (
                      <div>
                        Section:{" "}
                        {group
                          .sectionHeadings
                          .join(
                            ", "
                          )}
                      </div>
                    ) : null}
                  </div>
                )
              )}

            <div>
              Query-group labels describe
              observed search evidence only.
              They do not prove that the
              publication caused the change.
            </div>
          </>
        ) : null}

        {analytics?.outcome
          .diagnosis ? (
          <>
            <div
              className={
                styles.outcomeGrid
              }
            >
              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Observed diagnosis
                </span>

                <strong>
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .status
                  )}
                </strong>

                <div>
                  Phase{" "}
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .phase
                  )}
                </div>

                <div>
                  Latest{" "}
                  {analytics
                    .outcome
                    .diagnosis
                    .latestCheckpoint
                    ? analytics
                        .outcome
                        .diagnosis
                        .latestCheckpoint
                        .replaceAll(
                          "_",
                          " "
                        )
                    : "—"}
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Bottleneck
                </span>

                <strong>
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .bottleneck
                  )}
                </strong>

                <div>
                  Based on observed
                  checkpoint evidence
                </div>

                <div>
                  No causal inference
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Next action
                </span>

                <strong>
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .nextAction
                  )}
                </strong>

                <div>
                  Evidence checkpoints{" "}
                  {
                    analytics
                      .outcome
                      .diagnosis
                      .observationCount
                  }
                </div>

                <div>
                  No SEO score or
                  ranking probability
                </div>
              </div>

              <div
                className={
                  styles.outcomeCard
                }
              >
                <span>
                  Search trend
                </span>

                <strong>
                  Rank{" "}
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .trends
                      .rankFromBaseline
                  )}
                </strong>

                <div>
                  Impressions{" "}
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .trends
                      .impressionsFromBaseline
                  )}
                </div>

                <div>
                  Clicks{" "}
                  {statusLabel(
                    analytics
                      .outcome
                      .diagnosis
                      .trends
                      .clicksFromBaseline
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {analytics?.outcome
          .hasData ? (
          <div
            className={
              styles.outcomeGrid
            }
          >
            {analytics.outcome
              .observations
              .map(
                (
                  observation
                ) => (
                  <div
                    key={`${observation.checkpoint}-${observation.observedAt}`}
                    className={
                      styles.outcomeCard
                    }
                  >
                    <span>
                      {observation.checkpoint.replaceAll(
                        "_",
                        " "
                      )}
                    </span>

                    <strong>
                      {observation.liveRankState ===
                        "FOUND" &&
                      observation.liveRank
                        ? `#${observation.liveRank}`
                        : observation.liveRankState ===
                            "NOT_TOP_100"
                          ? "Not in top 100"
                          : "Rank unavailable"}
                    </strong>

                    <div>
                      Impressions
                      {" "}
                      {observation.impressions ??
                        "—"}
                    </div>

                    <div>
                      Clicks
                      {" "}
                      {observation.clicks ??
                        "—"}
                    </div>

                    <div>
                      Avg position
                      {" "}
                      {formatNumber(
                        observation.averagePosition
                      )}
                    </div>
                  </div>
                )
              )}
          </div>
        ) : (
          <div
            className={
              styles.noData
            }
          >
            <TrendingUp
              size={16}
            />

            <div>
              <strong>
                No outcome
                checkpoints
                yet
              </strong>

              <span>
                When this
                article is
                connected to
                an executed
                Growth OS
                action,
                baseline and
                7 / 14 / 28 / 60 / 90
                day
                observations
                appear here.
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon:
    Icon,
  label,
  value,
  detail,
}: {
  icon:
    typeof Activity;
  label:
    string;
  value:
    string;
  detail:
    string;
}) {
  return (
    <div
      className={
        styles.metric
      }
    >
      <div
        className={
          styles.metricLabel
        }
      >
        <Icon
          size={12}
        />

        <span>
          {label}
        </span>
      </div>

      <strong>
        {value}
      </strong>

      <small>
        {detail}
      </small>
    </div>
  );
}
