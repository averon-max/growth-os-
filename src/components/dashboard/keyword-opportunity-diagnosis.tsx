"use client";

import {
  useEffect,
  useState,
} from "react";

import styles from "./keyword-opportunity-diagnosis.module.css";

type Decision =
  | "CREATE"
  | "UPDATE"
  | "SKIP";

type Diagnosis = {
  keyword: string;
  market: string;
  liveRank: number | null;

  ownPage: {
    url: string;
    title: string | null;
    h1: string | null;
    wordCount: number | null;
    relevanceScore: number | null;
    inboundInternalLinks: number | null;
  } | null;

  competitors: Array<{
    rank: number;
    domain: string;
    url: string;
    title: string;
    fetched: boolean;
    h1: string | null;
    wordCount: number | null;
  }>;

  ownPagesInspected: number;
  competitorPagesFetched: number;
};

type StartedOutcomeAction = {
  id: string;
  decision: Decision;
  status: string;

  compatibilityStatus:
    | "SUPPORTED"
    | "EDUCATIONAL_ONLY"
    | "UNVERIFIED"
    | "CONFLICT";

  compatibilityReason:
    string;
};

type CreatedOutcomeBrief = {
  id: string;
  status: string;
  primaryKeyword: string;
};

type ActionPlan = {
  keyword: string;
  market: string;
  decision: Decision;

  targetPageUrl:
    string | null;

  rationale:
    string;

  evidence:
    string[];

  evidenceBackedTopics: Array<{
    topic: string;
    competitorCoverage: number;
    evidence: string[];
  }>;

  steps: Array<{
    type: string;
    title: string;
    explanation: string;
    evidence: string[];
  }>;

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

  guardrails:
    string[];
};

function decisionTitle(
  decision: Decision
): string {
  if (
    decision ===
    "CREATE"
  ) {
    return "Create a new page";
  }

  if (
    decision ===
    "UPDATE"
  ) {
    return "Improve an existing page";
  }

  return "No change for now";
}

function decisionLabel(
  decision: Decision
): string {
  if (
    decision ===
    "CREATE"
  ) {
    return "CREATE";
  }

  if (
    decision ===
    "UPDATE"
  ) {
    return "UPDATE";
  }

  return "SKIP";
}

export function KeywordOpportunityDiagnosis({
  websiteId,
  keyword,
  market,
  onClose,
}: {
  websiteId: string;
  keyword: string;
  market: string;
  onClose: () => void;
}) {
  const [
    diagnosis,
    setDiagnosis,
  ] =
    useState<Diagnosis | null>(
      null
    );

  const [
    actionPlan,
    setActionPlan,
  ] =
    useState<ActionPlan | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    startingAction,
    setStartingAction,
  ] =
    useState(
      false
    );

  const [
    startError,
    setStartError,
  ] =
    useState<string | null>(
      null
    );

  const [
    startedAction,
    setStartedAction,
  ] =
    useState<StartedOutcomeAction | null>(
      null
    );

  const [
    creatingOutcomeBrief,
    setCreatingOutcomeBrief,
  ] =
    useState(
      false
    );

  const [
    outcomeBriefError,
    setOutcomeBriefError,
  ] =
    useState<string | null>(
      null
    );

  const [
    createdOutcomeBrief,
    setCreatedOutcomeBrief,
  ] =
    useState<CreatedOutcomeBrief | null>(
      null
    );

  useEffect(
    () => {
      let active =
        true;

      const load =
        async () => {
          setLoading(
            true
          );

          setError(
            null
          );

          try {
            const params =
              new URLSearchParams({
                websiteId,
                keyword,
                market,
              });

            const response =
              await fetch(
                `/api/keywords/opportunity-diagnosis?${params.toString()}`,
                {
                  cache:
                    "no-store",
                }
              );

            const data =
              await response.json() as {
                diagnosis?: Diagnosis;
                actionPlan?: ActionPlan;
                error?: string;
              };

            if (
              !response.ok ||
              !data.diagnosis ||
              !data.actionPlan
            ) {
              throw new Error(
                data.error ??
                  "Could not build the plan."
              );
            }

            if (
              active
            ) {
              setDiagnosis(
                data.diagnosis
              );

              setActionPlan(
                data.actionPlan
              );
            }
          } catch (
            err
          ) {
            if (
              active
            ) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Could not build the plan."
              );
            }
          } finally {
            if (
              active
            ) {
              setLoading(
                false
              );
            }
          }
        };

      void load();

      return () => {
        active =
          false;
      };
    },
    [
      websiteId,
      keyword,
      market,
    ]
  );

  const createBriefFromOutcomeAction =
    async () => {
      if (
        !startedAction ||
        creatingOutcomeBrief
      ) {
        return;
      }

      if (
        startedAction.decision !==
        "CREATE"
      ) {
        return;
      }

      if (
        startedAction.compatibilityStatus !==
          "SUPPORTED" &&
        startedAction.compatibilityStatus !==
          "EDUCATIONAL_ONLY"
      ) {
        return;
      }

      setCreatingOutcomeBrief(
        true
      );

      setOutcomeBriefError(
        null
      );

      try {
        const response =
          await fetch(
            `/api/keywords/outcome-actions/${encodeURIComponent(
              startedAction.id
            )}/create-brief`,
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
                }),
            }
          );

        const data =
          await response.json() as {
            brief?: {
              id: string;
              status: string;
              primaryKeyword: string;
            };

            error?: string;
            reused?: boolean;
          };

        if (
          !response.ok ||
          !data.brief
        ) {
          throw new Error(
            data.error ??
              "Could not prepare the page."
          );
        }

        setCreatedOutcomeBrief(
          data.brief
        );
      } catch (
        err
      ) {
        setOutcomeBriefError(
          err instanceof Error
            ? err.message
            : "Could not prepare the page."
        );
      } finally {
        setCreatingOutcomeBrief(
          false
        );
      }
    };

  const startAction =
    async () => {
      if (
        !actionPlan ||
        startingAction
      ) {
        return;
      }

      setStartingAction(
        true
      );

      setStartError(
        null
      );

      try {
        const response =
          await fetch(
            "/api/keywords/outcome-actions",
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
                  keyword,
                  market,
                }),
            }
          );

        const data =
          await response.json() as {
            action?:
              StartedOutcomeAction;

            error?:
              string;
          };

        if (
          !response.ok ||
          !data.action
        ) {
          throw new Error(
            data.error ??
              "Could not save the plan."
          );
        }

        setStartedAction(
          data.action
        );
      } catch (
        err
      ) {
        setStartError(
          err instanceof Error
            ? err.message
            : "Could not save the plan."
        );
      } finally {
        setStartingAction(
          false
        );
      }
    };

  return (
    <div
      className={
        styles.panel
      }
    >
      <div
        className={
          styles.header
        }
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            Hyprlyx decision
          </p>

          <h3
            className={
              styles.title
            }
          >
            What to do for “{keyword}”
          </h3>

          <p
            className={
              styles.subtitle
            }
          >
            Based on your site,
            the saved Google results and competitor
            pages that were actually read.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.close
          }
          onClick={
            onClose
          }
        >
          Close
        </button>
      </div>

      {
        loading ? (
          <div
            className={
              styles.state
            }
          >
            Analyzing evidence and building the plan…
          </div>
        ) : error ? (
          <div
            className={`${styles.state} ${styles.error}`}
          >
            {error}
          </div>
        ) : diagnosis &&
          actionPlan ? (
          <>
            <div
              className={
                styles.decision
              }
            >
              <div
                className={
                  styles.decisionTop
                }
              >
                <span
                  className={`${styles.decisionBadge} ${
                    actionPlan.decision ===
                    "CREATE"
                      ? styles.create
                      : actionPlan.decision ===
                          "UPDATE"
                        ? styles.update
                        : styles.skip
                  }`}
                >
                  {
                    decisionLabel(
                      actionPlan.decision
                    )
                  }
                </span>

                <div>
                  <div
                    className={
                      styles.decisionTitle
                    }
                  >
                    {
                      decisionTitle(
                        actionPlan.decision
                      )
                    }
                  </div>

                  <div
                    className={
                      styles.decisionKeyword
                    }
                  >
                    {actionPlan.keyword}
                  </div>
                </div>
              </div>

              <p
                className={
                  styles.rationale
                }
              >
                {
                  actionPlan.rationale
                }
              </p>

              <div
                className={
                  styles.actionBar
                }
              >
                {
                  startedAction ? (
                    <div
                      className={`${styles.startStatus} ${
                        startedAction.compatibilityStatus ===
                          "UNVERIFIED" ||
                        startedAction.compatibilityStatus ===
                          "CONFLICT"
                          ? styles.startBlocked
                          : styles.startReady
                      }`}
                    >
                      <strong>
                        {
                          startedAction.compatibilityStatus ===
                          "UNVERIFIED"
                            ? "Confirm the service first"
                            : startedAction.compatibilityStatus ===
                                "CONFLICT"
                              ? "Action blocked"
                              : startedAction.compatibilityStatus ===
                                  "EDUCATIONAL_ONLY"
                                ? "Educational content only"
                                : actionPlan.decision ===
                                    "SKIP"
                                  ? "Decision saved"
                                  : "Plan saved and ready"
                        }
                      </strong>

                      <span>
                        {
                          startedAction.compatibilityReason
                        }
                      </span>

                      {
                        (
                          startedAction.compatibilityStatus ===
                            "UNVERIFIED" ||
                          startedAction.compatibilityStatus ===
                            "CONFLICT"
                        ) && (
                          <a
                            className={
                              styles.startLink
                            }
                            href={`/dashboard/content?websiteId=${encodeURIComponent(
                              websiteId
                            )}&outcomeActionId=${encodeURIComponent(
                              startedAction.id
                            )}`}
                          >
                            Review business details
                          </a>
                        )
                      }

                      {
                        startedAction.decision ===
                          "CREATE" &&
                        (
                          startedAction.compatibilityStatus ===
                            "SUPPORTED" ||
                          startedAction.compatibilityStatus ===
                            "EDUCATIONAL_ONLY"
                        ) && (
                          <div
                            className={
                              styles.createWorkflow
                            }
                          >
                            {
                              createdOutcomeBrief ? (
                                <>
                                  <div
                                    className={
                                      styles.createSuccess
                                    }
                                  >
                                    <strong>
                                      Page plan ready
                                    </strong>

                                    <span>
                                      Main topic:{" "}
                                      {
                                        createdOutcomeBrief.primaryKeyword
                                      }
                                    </span>
                                  </div>

                                  <a
                                    className={
                                      styles.startLink
                                    }
                                    href={`/dashboard/content?websiteId=${encodeURIComponent(
                                      websiteId
                                    )}`}
                                  >
                                    Open Content
                                  </a>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className={
                                    styles.startButton
                                  }
                                  disabled={
                                    creatingOutcomeBrief
                                  }
                                  onClick={
                                    () => {
                                      void createBriefFromOutcomeAction();
                                    }
                                  }
                                >
                                  {
                                    creatingOutcomeBrief
                                      ? "Preparing…"
                                      : startedAction.compatibilityStatus ===
                                          "EDUCATIONAL_ONLY"
                                        ? "Create an educational page"
                                        : "Create page"
                                  }
                                </button>
                              )
                            }

                            {
                              outcomeBriefError && (
                                <div
                                  className={
                                    styles.startError
                                  }
                                >
                                  {outcomeBriefError}
                                </div>
                              )
                            }
                          </div>
                        )
                      }
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={
                        styles.startButton
                      }
                      disabled={
                        startingAction
                      }
                      onClick={
                        () => {
                          void startAction();
                        }
                      }
                    >
                      {
                        startingAction
                          ? "Saving…"
                          : actionPlan.decision ===
                              "SKIP"
                            ? "Save decision"
                            : "Start"
                      }
                    </button>
                  )
                }

                {
                  startError && (
                    <div
                      className={
                        styles.startError
                      }
                    >
                      {startError}
                    </div>
                  )
                }
              </div>
            </div>

            <div
              className={
                styles.meta
              }
            >
              <div
                className={
                  styles.metaItem
                }
              >
                <strong
                  className={
                    styles.metaValue
                  }
                >
                  {
                    diagnosis.liveRank ===
                    null
                      ? "Not in top 100"
                      : `#${diagnosis.liveRank}`
                  }
                </strong>

                <span
                  className={
                    styles.metaLabel
                  }
                >
                  Google now
                </span>
              </div>

              <div
                className={
                  styles.metaItem
                }
              >
                <strong
                  className={
                    styles.metaValue
                  }
                >
                  {
                    diagnosis.ownPagesInspected
                  }
                </strong>

                <span
                  className={
                    styles.metaLabel
                  }
                >
                  site pages checked
                </span>
              </div>

              <div
                className={
                  styles.metaItem
                }
              >
                <strong
                  className={
                    styles.metaValue
                  }
                >
                  {
                    diagnosis.competitorPagesFetched
                  }/{diagnosis.competitors.length}
                </strong>

                <span
                  className={
                    styles.metaLabel
                  }
                >
                  competitors read
                </span>
              </div>

              <div
                className={
                  styles.metaItem
                }
              >
                <strong
                  className={
                    styles.metaValue
                  }
                >
                  {
                    actionPlan.evidenceBackedTopics.length
                  }
                </strong>

                <span
                  className={
                    styles.metaLabel
                  }
                >
                  confirmed content gaps
                </span>
              </div>
            </div>

            <div
              className={
                styles.grid
              }
            >
              <div
                className={
                  styles.column
                }
              >
                <h4
                  className={
                    styles.sectionTitle
                  }
                >
                  Why this decision
                </h4>

                <div
                  className={
                    styles.evidenceList
                  }
                >
                  {
                    actionPlan.evidence.map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item
                          }
                          className={
                            styles.evidenceRow
                          }
                        >
                          <span
                            className={
                              styles.evidenceDot
                            }
                          />

                          <span>
                            {item}
                          </span>
                        </div>
                      )
                    )
                  }
                </div>

                {
                  diagnosis.ownPage && (
                    <div
                      className={
                        styles.contextBlock
                      }
                    >
                      <div
                        className={
                          styles.contextLabel
                        }
                      >
                        Closest existing page
                      </div>

                      <div
                        className={
                          styles.contextValue
                        }
                      >
                        {
                          diagnosis.ownPage.url
                        }
                      </div>

                      <div
                        className={
                          styles.contextSub
                        }
                      >
                        Topic match:{" "}
                        {
                          diagnosis.ownPage.relevanceScore ===
                          null
                            ? "—"
                            : `${Math.round(
                                diagnosis.ownPage.relevanceScore *
                                  100
                              )}%`
                        }
                      </div>
                    </div>
                  )
                }

                <h4
                  className={
                    styles.sectionTitle
                  }
                  style={{
                    marginTop:
                      18,
                  }}
                >
                  What competitors confirm
                </h4>

                {
                  actionPlan.evidenceBackedTopics.length ===
                  0 ? (
                    <div
                      className={
                        styles.emptyEvidence
                      }
                    >
                      No confirmed shared content gaps yet.
                      Hyprlyx will not invent sections without enough evidence.
                    </div>
                  ) : (
                    actionPlan.evidenceBackedTopics.map(
                      (
                        topic
                      ) => (
                        <div
                          key={
                            topic.topic
                          }
                          className={
                            styles.topic
                          }
                        >
                          <div
                            className={
                              styles.itemTitle
                            }
                          >
                            {
                              topic.topic
                            }
                          </div>

                          <div
                            className={
                              styles.body
                            }
                          >
                            Confirmed on{" "}
                            {
                              topic.competitorCoverage
                            } competitor pages.
                          </div>
                        </div>
                      )
                    )
                  )
                }

                <h4
                  className={
                    styles.sectionTitle
                  }
                  style={{
                    marginTop:
                      18,
                  }}
                >
                  Checked competitors
                </h4>

                {
                  diagnosis.competitors.map(
                    (
                      competitor
                    ) => (
                      <div
                        key={`${competitor.rank}-${competitor.url}`}
                        className={
                          styles.competitor
                        }
                      >
                        <div
                          className={
                            styles.competitorTop
                          }
                        >
                          <strong>
                            #{competitor.rank}{" "}
                            {competitor.domain}
                          </strong>

                          <span
                            className={
                              competitor.fetched
                                ? styles.readOk
                                : styles.readNo
                            }
                          >
                            {
                              competitor.fetched
                                ? "read"
                                : "SERP only"
                            }
                          </span>
                        </div>

                        <div
                          className={
                            styles.body
                          }
                        >
                          {
                            competitor.title
                          }
                        </div>
                      </div>
                    )
                  )
                }
              </div>

              <div
                className={
                  styles.column
                }
              >
                <h4
                  className={
                    styles.sectionTitle
                  }
                >
                  Action plan
                </h4>

                {
                  actionPlan.steps.map(
                    (
                      step,
                      index
                    ) => (
                      <div
                        key={`${step.type}-${index}`}
                        className={
                          styles.step
                        }
                      >
                        <div
                          className={
                            styles.stepHeader
                          }
                        >
                          <span
                            className={
                              styles.stepIndex
                            }
                          >
                            {
                              index +
                              1
                            }
                          </span>

                          <div>
                            <div
                              className={
                                styles.stepTitle
                              }
                            >
                              {
                                step.title
                              }
                            </div>

                            <div
                              className={
                                styles.stepType
                              }
                            >
                              {
                                step.type
                              }
                            </div>
                          </div>
                        </div>

                        <p
                          className={
                            styles.stepBody
                          }
                        >
                          {
                            step.explanation
                          }
                        </p>

                        {
                          step.evidence.length >
                            0 && (
                            <div
                              className={
                                styles.stepEvidence
                              }
                            >
                              {
                                step.evidence.map(
                                  (
                                    item
                                  ) => (
                                    <div
                                      key={
                                        item
                                      }
                                    >
                                      • {item}
                                    </div>
                                  )
                                )
                              }
                            </div>
                          )
                        }
                      </div>
                    )
                  )
                }

                <div
                  className={
                    styles.measurement
                  }
                >
                  <div
                    className={
                      styles.measurementTitle
                    }
                  >
                    How we measure results
                  </div>

                  <div
                    className={
                      styles.checkpoints
                    }
                  >
                    {
                      actionPlan.measurement.checkpointsDays.map(
                        (
                          day
                        ) => (
                          <span
                            key={
                              day
                            }
                            className={
                              styles.checkpoint
                            }
                          >
                            {day} days
                          </span>
                        )
                      )
                    }
                  </div>

                  <div
                    className={
                      styles.body
                    }
                  >
                    Position, impressions, clicks and CTR, when data is available.
                    Compared with a baseline; no causality or specific growth is promised.
                  </div>
                </div>

                <details
                  className={
                    styles.advanced
                  }
                >
                  <summary>
                    Technical details
                  </summary>

                  <div
                    className={
                      styles.advancedBody
                    }
                  >
                    <div>
                      Median competitor word count:{" "}
                      {
                        actionPlan.observations.competitorMedianWordCount ??
                        "—"
                      }
                    </div>

                    <div>
                      Observation only, not a target word count.
                    </div>

                    <div
                      className={
                        styles.guardrails
                      }
                    >
                      {
                        actionPlan.guardrails.map(
                          (
                            guardrail
                          ) => (
                            <div
                              key={
                                guardrail
                              }
                            >
                              • {guardrail}
                            </div>
                          )
                        )
                      }
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </>
        ) : null
      }
    </div>
  );
}
