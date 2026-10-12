"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { KeywordOrbitVisualization } from "./keyword-orbit-visualization";

import styles from "./content-generation-hud.module.css";


type GenerationMode =
  | "PLANNING"
  | "WRITING";


const PLANNING_ACTIVITY = [
  "Mapping search intent",
  "Resolving keyword ownership",
  "Inspecting live SERP evidence",
  "Building evidence-aware blueprint",
] as const;


const WRITING_ACTIVITY = [
  "Executing article contracts",
  "Writing from approved evidence",
  "Running semantic verification",
  "Preparing critics and SERP replay",
] as const;


function formatElapsed(
  seconds:
    number
): string {
  const minutes =
    Math.floor(
      seconds / 60
    );

  const remaining =
    seconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
}


export function ContentGenerationHud({
  mode,
  topic,
  primaryKeyword,
  searchIntent,
  keywords = [],
  preview = false,
}: {
  mode:
    GenerationMode;

  topic:
    string;

  primaryKeyword?:
    string | null;

  searchIntent?:
    string | null;

  keywords?: readonly string[];

  preview?: boolean;
}) {
  const [
    elapsed,
    setElapsed,
  ] =
    useState(0);


  useEffect(
    () => {
      const started =
        Date.now();

      const timer =
        window.setInterval(
          () => {
            setElapsed(
              Math.floor(
                (
                  Date.now() -
                  started
                ) /
                  1000
              )
            );
          },
          1000
        );

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      mode,
      topic,
    ]
  );


  const activity =
    mode ===
    "PLANNING"
      ? PLANNING_ACTIVITY
      : WRITING_ACTIVITY;


  const activeActivity =
    activity[
      Math.floor(
        elapsed / 3
      ) %
        activity.length
    ];


  const cleanTopic =
    topic.trim() ||
    "Untitled article";


  const ticker =
    useMemo(
      () =>
        [
          "SEARCH MISSION",
          "DEMAND GRAPH",
          "KEYWORD OWNERSHIP",
          "LIVE SERP",
          "EVIDENCE",
          "BLUEPRINT",
          "WRITER",
          "SEMANTIC CRITICS",
          "SERP REPLAY",
          "RANK READY",
        ].join(
          "   ·   "
        ),
      []
    );


  return (
    <section
      className={
        styles.hud
      }
      aria-live="polite"
      aria-label="Article generation progress"
    >
      <div
        className={
          styles.ambientGlow
        }
      />

      <div
        className={
          styles.header
        }
      >
        <div
          className={
            styles.identity
          }
        >
          <div
            className={
              styles.orb
            }
          >
            <Sparkles
              size={15}
            />
          </div>

          <div>
            <div
              className={
                styles.eyebrow
              }
            >
              Growth OS
              generation engine
            </div>

            <div
              className={
                styles.title
              }
            >
              {mode ===
              "PLANNING"
                ? "Building search intelligence"
                : "Generating rank-ready article"}
            </div>
          </div>
        </div>

        <div
          className={
            styles.live
          }
        >
          <span
            className={
              styles.liveDot
            }
          />

          {preview ? "PREVIEW" : "LIVE"}
        </div>
      </div>


      <KeywordOrbitVisualization topic={topic} keywords={keywords} />

      <div
        className={
          styles.activity
        }
      >
        <Activity
          size={14}
        />

        <span
          className={
            styles.activityLabel
          }
        >
          Pipeline activity
        </span>

        <span
          className={
            styles.activityText
          }
          key={
            activeActivity
          }
        >
          {activeActivity}
        </span>

        <span
          className={
            styles.cursor
          }
        />
      </div>


      <div
        className={
          styles.progress
        }
        aria-hidden="true"
      >
        <div
          className={
            styles.progressGrid
          }
        />

        <div
          className={
            styles.progressBeam
          }
        />

        <div
          className={
            styles.progressGlow
          }
        />
      </div>


      <div
        className={
          styles.ticker
        }
        aria-hidden="true"
      >
        <div
          className={
            styles.tickerTrack
          }
        >
          <span>
            {ticker}
          </span>

          <span>
            {ticker}
          </span>
        </div>
      </div>


      <div
        className={
          styles.metrics
        }
      >
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
            Elapsed
          </span>

          <strong>
            {formatElapsed(
              elapsed
            )}
          </strong>
        </div>


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
            Phase
          </span>

          <strong>
            {mode ===
            "PLANNING"
              ? "Research"
              : "Article"}
          </strong>
        </div>


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
            Primary query
          </span>

          <strong
            title={
              primaryKeyword ??
              cleanTopic
            }
          >
            {primaryKeyword ??
              cleanTopic}
          </strong>
        </div>


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
            Intent
          </span>

          <strong>
            {searchIntent ??
              (
                mode ===
                "PLANNING"
                  ? "Resolving"
                  : "Locked"
              )}
          </strong>
        </div>
      </div>


      <div
        className={
          styles.footer
        }
      >
        <CheckCircle2
          size={13}
        />

        <span>
          {preview
            ? "Visual preview only — no API calls or article creation."
            : "No artificial percentage — completion follows the real generation request."}
        </span>
      </div>
    </section>
  );
}
