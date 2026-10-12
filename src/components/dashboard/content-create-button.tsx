"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import styles from "./content-create-button.module.css";

import { ContentGenerationHud } from "./content-generation-hud";

type Stage =
  | "IDLE"
  | "PLANNING"
  | "WRITING";

interface KeywordResearchReportV2 {
  version: "KEYWORD_INTELLIGENCE_RESEARCH_V2";
  approvedResearchKey: string;
  observed: number;
  excludedCount: number;
  selectedKeyword: string | null;
  decision: {
    status: "SELECTED" | "REVIEW" | "NO_GO";
    confidence: "HIGH" | "MEDIUM" | "LOW";
    reasons: string[];
    risks: string[];
  };
  clusters: Array<{
    id: string;
    primary: {
      keyword: string;
      searchVolume: number | null;
      keywordDifficulty: number | null;
    };
    opportunityScore: number;
  }>;
}

interface ContentSuggestionItemV1 {
  readonly keyword:
    string;

  readonly source:
    "SITE_KEYWORD"
    | "GSC"
    | "CACHED_RELATED";

  readonly searchVolume:
    number | null;

  readonly difficulty:
    number | null;

  readonly position:
    number | null;

  readonly impressions:
    number;

  readonly clicks:
    number;
}


interface ContentSuggestionsResponseV1 {
  readonly version:
    "CONTENT_SUGGESTIONS_V1";

  readonly paidApiUsed:
    false;

  readonly recommended:
    readonly ContentSuggestionItemV1[];

  readonly related:
    readonly ContentSuggestionItemV1[];
}


type ArticleTypeSelection =
  | "AUTO"
  | "EXPLAINER_GUIDE"
  | "HOW_TO"
  | "COMPARISON"
  | "CURATED_LIST"
  | "RANKED_LIST"
  | "PRODUCT_DETAIL_EDUCATION"
  | "PRODUCT_REVIEW"
  | "SERVICE_LANDING"
  | "LOCAL_SERVICE_GUIDE"
  | "LOCAL_DIRECTORY"
  | "AUDIENCE_USE_CASE"
  | "IDEAS_USE_CASES"
  | "PROBLEM_SOLUTION"
  | "COMMERCIAL_CATEGORY"
  | "BRAND_SHOP_HUB";


const ARTICLE_TYPE_OPTIONS:
  readonly {
    value:
      ArticleTypeSelection;

    label:
      string;
  }[] =
    [
      {
        value:
          "AUTO",
        label:
          "Auto — Search intent + SERP",
      },
      {
        value:
          "EXPLAINER_GUIDE",
        label:
          "Guide / Explainer",
      },
      {
        value:
          "HOW_TO",
        label:
          "How-to",
      },
      {
        value:
          "COMPARISON",
        label:
          "Comparison",
      },
      {
        value:
          "CURATED_LIST",
        label:
          "List / Roundup",
      },
      {
        value:
          "RANKED_LIST",
        label:
          "Ranked list",
      },
      {
        value:
          "PRODUCT_DETAIL_EDUCATION",
        label:
          "Product page",
      },
      {
        value:
          "PRODUCT_REVIEW",
        label:
          "Product review",
      },
      {
        value:
          "SERVICE_LANDING",
        label:
          "Service page",
      },
      {
        value:
          "LOCAL_SERVICE_GUIDE",
        label:
          "Local service guide",
      },
      {
        value:
          "LOCAL_DIRECTORY",
        label:
          "Local directory",
      },
      {
        value:
          "AUDIENCE_USE_CASE",
        label:
          "Audience / Use case",
      },
      {
        value:
          "IDEAS_USE_CASES",
        label:
          "Ideas",
      },
      {
        value:
          "PROBLEM_SOLUTION",
        label:
          "Problem / Solution",
      },
      {
        value:
          "COMMERCIAL_CATEGORY",
        label:
          "Category / Collection",
      },
      {
        value:
          "BRAND_SHOP_HUB",
        label:
          "Brand / Shop",
      },
    ];


export function ContentCreateButton({
  websiteId,
}: {
  websiteId: string;
}) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    topic,
    setTopic,
  ] =
    useState("");

  /*
   * Checked = use exactly what the user entered.
   * Unchecked = treat input as a seed and let existing
   * Keyword Intelligence choose the production primary.
   */
  const [
    useExactKeyword,
    setUseExactKeyword,
  ] =
    useState(true);


  const [
    articleType,
    setArticleType,
  ] =
    useState<ArticleTypeSelection>(
      "AUTO"
    );


  const [
    stage,
    setStage,
  ] =
    useState<Stage>(
      "IDLE"
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [researching, setResearching] = useState(false);
  const [previewAnimation, setPreviewAnimation] = useState(false);
  const [researchReport, setResearchReport] =
    useState<KeywordResearchReportV2 | null>(null);
  const [approvedResearchKey, setApprovedResearchKey] =
    useState<string | null>(null);

  const busy =
    stage !== "IDLE" || researching;

  const [
    suggestions,
    setSuggestions,
  ] =
    useState<ContentSuggestionsResponseV1>({
      version:
        "CONTENT_SUGGESTIONS_V1",

      paidApiUsed:
        false,

      recommended:
        [],

      related:
        [],
    });


  const [
    suggestionsLoading,
    setSuggestionsLoading,
  ] =
    useState(
      false
    );


  /*
   * CONTENT_SUGGESTIONS_UI_V1
   *
   * Endpoint is DB/GSC/cache-only.
   * It never calls DataForSEO or an LLM.
   */
  useEffect(
    () => {
      if (!open) {
        return;
      }

      const controller =
        new AbortController();

      const timer =
        window.setTimeout(
          async () => {
            try {
              setSuggestionsLoading(
                true
              );

              const params =
                new URLSearchParams({
                  websiteId,
                });

              const cleanTopic =
                topic.trim();

              if (cleanTopic) {
                params.set(
                  "seed",
                  cleanTopic
                );
              }

              const response =
                await fetch(
                  `/api/content/suggestions?${params.toString()}`,
                  {
                    signal:
                      controller.signal,

                    cache:
                      "no-store",
                  }
                );

              if (!response.ok) {
                return;
              }

              const json =
                await response.json() as
                  ContentSuggestionsResponseV1;

              if (
                json.version ===
                  "CONTENT_SUGGESTIONS_V1" &&
                json.paidApiUsed ===
                  false
              ) {
                setSuggestions(
                  json
                );
              }
            } catch (
              cause
            ) {
              if (
                cause instanceof
                  DOMException &&
                cause.name ===
                  "AbortError"
              ) {
                return;
              }
            } finally {
              if (
                !controller.signal
                  .aborted
              ) {
                setSuggestionsLoading(
                  false
                );
              }
            }
          },
          topic.trim()
            ? 280
            : 0
        );


      return () => {
        window.clearTimeout(
          timer
        );

        controller.abort();
      };
    },
    [
      open,
      topic,
      websiteId,
    ]
  );


  async function runKeywordResearchV2() {
    const seed = topic.trim();
    if (seed.length < 3) {
      setError("Enter a seed topic first.");
      return;
    }

    setResearching(true);
    setResearchReport(null);
    setApprovedResearchKey(null);
    setError(null);
    try {
      // This request is user-triggered only; it authorizes paid research.
      const response = await fetch("/api/keywords/opportunities-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId, seed, market: "US", limit: 500,
          deepSerpLimit: 5, authorizePaidResearch: true,
          useGptDecision: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Keyword research failed.");
      }
      if (result.version !== "KEYWORD_INTELLIGENCE_RESEARCH_V2") {
        throw new Error("Unexpected keyword research response.");
      }
      const report = result as KeywordResearchReportV2;
      setResearchReport(report);
      if (report.decision.status === "SELECTED" &&
          typeof report.selectedKeyword === "string" &&
          typeof report.approvedResearchKey === "string") {
        setApprovedResearchKey(report.approvedResearchKey);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Keyword research failed.");
    } finally {
      setResearching(false);
    }
  }

  async function createArticle(
    event:
      FormEvent
  ) {
    event.preventDefault();

    const cleanTopic =
      topic.trim();

    if (
      cleanTopic.length <
      3
    ) {
      setError(
        "Enter a topic first."
      );

      return;
    }

    if (!useExactKeyword && !approvedResearchKey) {
      setError("Run keyword research and approve an eligible winner before writing.");
      return;
    }
    setError(null);

    try {
      setStage(
        "PLANNING"
      );

      const briefResponse =
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

                topic:
                  cleanTopic,

                generationMode:
                  useExactKeyword
                    ? "EXACT_KEYWORD"
                    : "BEST_OPPORTUNITY",

                approvedResearchKey:
                  useExactKeyword
                    ? undefined
                    : approvedResearchKey,

                exactKeyword:
                  useExactKeyword
                    ? cleanTopic
                    : undefined,

                templateOverride:
                  articleType ===
                    "AUTO"
                    ? undefined
                    : articleType,

                reason:
                  "This topic was selected for a new content page.",

                recommendation:
                  "Create an evidence-backed page that matches search intent and verified business information.",
              }),
          }
        );

      const briefJson =
        await briefResponse.json();

      if (
        !briefResponse.ok
      ) {
        const message =
          typeof briefJson
            ?.error ===
            "string"
            ? briefJson.error
            : "Growth OS could not build the content plan.";

        const code =
          typeof briefJson
            ?.code ===
            "string"
            ? ` [${briefJson.code}]`
            : "";

        throw new Error(
          `${message}${code}`
        );
      }

      const briefId =
        briefJson
          ?.brief
          ?.id;

      if (!briefId) {
        throw new Error(
          "The content plan was created without an ID."
        );
      }

      setStage(
        "WRITING"
      );

      const articleResponse =
        await fetch(
          `/api/content/briefs/${briefId}/generate-article`,
          {
            method:
              "POST",
          }
        );

      const articleJson =
        await articleResponse.json();

      // GROWTH_OS_EXISTING_ARTICLE_RECOVERY_UI_V1
      // A failed generation response may be stale after a
      // separate successful production recovery.
      if (!articleResponse.ok && articleJson?.articleId) {
        try {
          const currentResponse = await fetch(
            `/api/content/articles/${encodeURIComponent(String(articleJson.articleId))}`,
            { cache: "no-store" }
          );

          if (currentResponse.ok) {
            const currentData = await currentResponse.json();
            const currentArticle = currentData.article ?? currentData;

            if (currentArticle?.status === "IN_REVIEW") {
              window.location.assign(
                `/dashboard/content/articles/${encodeURIComponent(String(articleJson.articleId))}`
              );
              return;
            }
          }
        } catch {
          // Preserve the original API error if the status check fails.
        }
      }


      if (
        !articleResponse.ok
      ) {
        throw new Error(
          articleJson.error ??
            "The plan was created, but the article could not be written."
        );
      }

      const articleId =
        articleJson
          ?.article
          ?.id;

      if (!articleId) {
        throw new Error(
          "The article was generated without an ID."
        );
      }

      router.push(
        `/dashboard/content/articles/${articleId}`
      );

      router.refresh();
    } catch (
      cause
    ) {
      setStage(
        "IDLE"
      );

      setError(
        cause instanceof
          Error
          ? cause.message
          : "Something went wrong."
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className={
          styles.trigger
        }
        onClick={() => {
          setArticleType(
            "AUTO"
          );

          setError(
            null
          );

          setOpen(
            true
          );
        }}
      >
        <Plus
          size={13}
        />

        Create content
      </button>

      {open ? (
        <div
          className={
            styles.backdrop
          }
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !busy
            ) {
              setOpen(
                false
              );
            }
          }}
        >
          <div
            className={
              busy || previewAnimation ? `${styles.dialog} ${styles.dialogVisual}` : styles.dialog
            }
          >
            <div
              className={
                styles.header
              }
            >
              <div>
                <div
                  className={
                    styles.kicker
                  }
                >
                  New article
                </div>

                <h2>
                  What should
                  this page be
                  about?
                </h2>
              </div>

              <button
                type="button"
                className={
                  styles.close
                }
                onClick={() =>
                  setOpen(
                    false
                  )
                }
                disabled={
                  busy
                }
                aria-label="Close"
              >
                <X
                  size={14}
                />
              </button>
            </div>

            <form
              onSubmit={
                createArticle
              }
            >

              <div
                className={
                  styles.templateField
                }
              >
                <label
                  htmlFor="content-article-type"
                  className={
                    styles.templateLabel
                  }
                >
                  Article type
                </label>

                <select
                  id="content-article-type"
                  className={
                    styles.templateSelect
                  }
                  value={
                    articleType
                  }
                  disabled={
                    busy
                  }
                  onChange={(
                    event
                  ) => {
                    setArticleType(
                      event.target
                        .value as
                        ArticleTypeSelection
                    );
                  }}
                >
                  {ARTICLE_TYPE_OPTIONS.map(
                    (
                      option
                    ) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {
                          option.label
                        }
                      </option>
                    )
                  )}
                </select>

                <div
                  className={
                    styles.templateHint
                  }
                >
                  Auto is recommended. Article type changes structure planning only — evidence and SEO safety still apply.
                </div>
              </div>

              <label
                className={
                  styles.label
                }
              >
                Topic or
                search phrase
              </label>

              <input
                autoFocus
                value={
                  topic
                }
                onChange={(event) => {
                  setTopic(event.target.value);
                  setResearchReport(null);
                  setApprovedResearchKey(null);
                }}
                placeholder="e.g. credit monitoring"
                className={
                  styles.input
                }
                disabled={
                  busy
                }
              />

              <div
                className={
                  styles.suggestionsPanel
                }
              >
                <div
                  className={
                    styles.suggestionsHeader
                  }
                >
                  <span>
                    Suggestions
                  </span>

                  <span
                    className={
                      styles.suggestionsSource
                    }
                  >
                    {suggestionsLoading
                      ? "Loading…"
                      : "Local data only"}
                  </span>
                </div>

                {suggestions
                  .recommended
                  .length >
                0 ? (
                  <div
                    className={
                      styles.suggestionGroup
                    }
                  >
                    <div
                      className={
                        styles.suggestionGroupLabel
                      }
                    >
                      Recommended
                    </div>

                    <div
                      className={
                        styles.suggestionChips
                      }
                    >
                      {suggestions
                        .recommended
                        .map(
                          (
                            suggestion
                          ) => (
                            <button
                              key={
                                `recommended:${suggestion.keyword}`
                              }
                              type="button"
                              className={
                                styles.suggestionChip
                              }
                              disabled={
                                busy
                              }
                              onClick={() => {
                                setTopic(
                                  suggestion.keyword
                                );
                              }}
                            >
                              <span>
                                {
                                  suggestion.keyword
                                }
                              </span>

                              {suggestion
                                .searchVolume !==
                              null ? (
                                <small>
                                  {
                                    suggestion.searchVolume
                                  } vol
                                </small>
                              ) : null}
                            </button>
                          )
                        )}
                    </div>
                  </div>
                ) : null}

                {suggestions
                  .related
                  .length >
                0 ? (
                  <div
                    className={
                      styles.suggestionGroup
                    }
                  >
                    <div
                      className={
                        styles.suggestionGroupLabel
                      }
                    >
                      Related
                    </div>

                    <div
                      className={
                        styles.suggestionChips
                      }
                    >
                      {suggestions
                        .related
                        .map(
                          (
                            suggestion
                          ) => (
                            <button
                              key={
                                `related:${suggestion.keyword}`
                              }
                              type="button"
                              className={
                                styles.suggestionChip
                              }
                              disabled={
                                busy
                              }
                              onClick={() => {
                                setTopic(
                                  suggestion.keyword
                                );
                              }}
                            >
                              <span>
                                {
                                  suggestion.keyword
                                }
                              </span>

                              {suggestion
                                .searchVolume !==
                              null ? (
                                <small>
                                  {
                                    suggestion.searchVolume
                                  } vol
                                </small>
                              ) : null}
                            </button>
                          )
                        )}
                    </div>
                  </div>
                ) : null}

                {!suggestionsLoading &&
                suggestions
                  .recommended
                  .length ===
                  0 &&
                suggestions
                  .related
                  .length ===
                  0 ? (
                  <div
                    className={
                      styles.suggestionsEmpty
                    }
                  >
                    No cached or site keyword suggestions yet.
                  </div>
                ) : null}
              </div>


              {/* CONTENT_GENERATION_MODE_UI_V1 */}
              <label
                className={
                  styles.modeToggle
                }
              >
                <input
                  type="checkbox"
                  checked={
                    useExactKeyword
                  }
                  onChange={(event) => {
                    setUseExactKeyword(event.target.checked);
                    setResearchReport(null);
                    setApprovedResearchKey(null);
                  }}
                  disabled={
                    busy
                  }
                  className={
                    styles.modeCheckbox
                  }
                />

                <span
                  className={
                    styles.modeCopy
                  }
                >
                  <strong>
                    Use exact keyword
                  </strong>

                  <span>
                    {useExactKeyword
                      ? "Growth OS will target this exact search phrase."
                      : "Growth OS will use this as a seed and choose the strongest eligible keyword from real SEO data."}
                  </span>
                </span>
              </label>

              {!useExactKeyword ? (
                <div className={styles.suggestionsPanel}>
                  <div className={styles.suggestionsHeader}>
                    <span>Keyword Intelligence V2</span>
                    <span className={styles.suggestionsSource}>
                      Up to 500 queries · US · paid API
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={busy || topic.trim().length < 3}
                    onClick={runKeywordResearchV2}
                  >
                    {researching ? "Researching keywords…" : "Run paid research + GPT selection"}
                  </button>
                  {researchReport ? (
                    <div className={styles.suggestionGroup}>
                      <div className={styles.suggestionGroupLabel}>
                        {researchReport.observed} observed · {researchReport.excludedCount} excluded
                      </div>
                      <div className={styles.suggestionsSource}>
                        {researchReport.decision.status} · {researchReport.decision.confidence} confidence
                      </div>
                      {researchReport.clusters.map((cluster, index) => (
                        <div key={cluster.id} className={styles.suggestionChip}>
                          <span>{index + 1}. {cluster.primary.keyword}</span>
                          <small>
                            Vol {cluster.primary.searchVolume ?? "?"} · KD {cluster.primary.keywordDifficulty ?? "?"}
                          </small>
                        </div>
                      ))}
                      {researchReport.selectedKeyword ? (
                        <div className={styles.suggestionGroupLabel}>
                          GPT selected: {researchReport.selectedKeyword}
                        </div>
                      ) : (
                        <div className={styles.suggestionsEmpty}>
                          No approved winner. Review keyword eligibility before writing.
                        </div>
                      )}
                      {researchReport.decision.reasons.slice(0, 3).map((reason, i) => (
                        <div key={i} className={styles.suggestionsSource}>{reason}</div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                className={
                  styles.explainer
                }
              >
                <Sparkles
                  size={13}
                />

                <span>
                  Growth OS
                  will check
                  search
                  intent,
                  business
                  evidence
                  and the
                  content
                  plan before
                  writing.
                </span>
              </div>

              {/* The visual runs only for real pending requests or explicit
                  local preview; it never starts research or article writes. */}
              {busy || previewAnimation ? (
                <ContentGenerationHud
                  preview={!busy && previewAnimation}
                  mode={stage === "WRITING" ? "WRITING" : "PLANNING"}
                  topic={topic}
                  keywords={
                    researchReport?.clusters.map(cluster => cluster.primary.keyword) ??
                    suggestions.related.map(item => item.keyword)
                  }
                />
              ) : null}

              {error ? (
                <div
                  className={
                    styles.error
                  }
                >
                  {error}
                </div>
              ) : null}

              <div className={styles.previewRow}>
                <button
                  type="button"
                  className={styles.previewButton}
                  disabled={busy}
                  onClick={() => setPreviewAnimation(value => !value)}
                  aria-pressed={previewAnimation}
                >
                  {previewAnimation ? "Hide animation preview" : "Preview keyword universe — free"}
                </button>
              </div>

              <div
                className={
                  styles.actions
                }
              >
                <button
                  type="button"
                  className={
                    styles.secondary
                  }
                  disabled={
                    busy
                  }
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    styles.primary
                  }
                  disabled={
                    busy || (!useExactKeyword && !approvedResearchKey)
                  }
                >
                  {stage ===
                  "PLANNING"
                    ? "Building plan…"
                    : stage ===
                        "WRITING"
                      ? "Writing article…"
                      : "Create article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
