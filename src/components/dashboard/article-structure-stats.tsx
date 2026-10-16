"use client";

import {
  useMemo,
} from "react";

import {
  FileText,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Type,
} from "lucide-react";

import styles from "./article-structure-stats.module.css";

import {
  computeArticleStructureStatsV1,
} from "@/lib/content/article-structure-stats-v1";

import {
  detectPersistedArticleEditorialRepetitionV1,
} from "@/lib/content/editorial-repetition-guard-v1";


export function ArticleStructureStats({
  title,
  h1,
  bodyMarkdown,
  keywords,
  status,
}: {
  title:
    string;

  h1:
    string;

  bodyMarkdown:
    string;

  keywords:
    readonly string[];
  status?: string;
}) {
  /*
   * ARTICLE_STRUCTURE_CANONICAL_V1
   *
   * Same analyzer as Final Readiness. No private regex parser.
   */
  const stats =
    useMemo(
      () =>
        computeArticleStructureStatsV1({
          title,
          h1,
          bodyMarkdown,
          keywords,
        }),
      [
        bodyMarkdown,
        h1,
        keywords,
        title,
      ]
    );


  const editorialFindings=useMemo(
    ()=>detectPersistedArticleEditorialRepetitionV1(bodyMarkdown),
    [bodyMarkdown]
  );

    const metrics = [
    {
      label:
        "Words",

      value:
        stats.words,

      icon:
        FileText,
    },

    {
      label:
        "Characters",

      value:
        stats.characters,

      icon:
        Type,
    },

    {
      label:
        "H1",

      value:
        stats.h1,

      icon:
        Heading1,
    },

    {
      label:
        "H2",

      value:
        stats.h2,

      icon:
        Heading2,
    },

    {
      label:
        "H3",

      value:
        stats.h3,

      icon:
        Heading3,
    },

    {
      label:
        "Keywords used",

      value:
        `${stats.usedKeywords}/${stats.keywordRows.length}`,

      icon:
        Hash,
    },

    {
      label:
        "Coverage",

      value:
        stats.coverage ===
        null
          ? "—"
          : `${stats.coverage}%`,

      icon:
        Hash,
    },
  ] as const;


  return (
    <section
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
          <span
            className={
              styles.eyebrow
            }
          >
            Article intelligence
          </span>

          <h2>
            Structure & keyword coverage
          </h2>
        </div>

        <span
          className={
            styles.badge
          }
        >
          {status === "IN_REVIEW"
            ? "In review"
            : status === "APPROVED"
              ? "Approved"
              : status === "PUBLISHED"
                ? "Published"
                : status === "GENERATING"
                  ? "Generating"
                  : status === "REJECTED"
                    ? "Needs revision"
                    : status === "BLOCKED_EXTERNAL"
                      ? "Waiting for provider"
                      : "Draft"}
        </span>
      </div>


      {editorialFindings.length>0 && (
        <div className={styles.editorialWarning} role="alert">
          <strong>Editorial revision required.</strong>{" "}
          Repeated explanations or advice were detected across
          sections. Keyword coverage alone does not measure article quality.
          Review section {editorialFindings[0].sectionIndex+1} before approval.
        </div>
      )}

      <div
        className={
          styles.metrics
        }
      >
        {metrics.map(
          (
            metric
          ) => {
            const Icon =
              metric.icon;

            return (
              <div
                key={
                  metric.label
                }
                className={
                  styles.metric
                }
              >
                <div
                  className={
                    styles.metricIcon
                  }
                >
                  <Icon
                    size={
                      13
                    }
                  />
                </div>

                <div>
                  <span
                    className={
                      styles.metricLabel
                    }
                  >
                    {
                      metric.label
                    }
                  </span>

                  <strong>
                    {
                      metric.value
                    }
                  </strong>
                </div>
              </div>
            );
          }
        )}
      </div>


      {stats.keywordRows
        .length >
        0 ? (
        <div
          className={
            styles.keywordArea
          }
        >
          <div
            className={
              styles.keywordTitle
            }
          >
            Planned keywords
          </div>

          <div
            className={
              styles.keywords
            }
          >
            {stats.keywordRows.map(
              (
                item
              ) => (
                <span
                  key={
                    item.keyword
                  }
                  className={
                    styles.keyword
                  }
                  title={`${item.mentions} exact mention${item.mentions === 1 ? "" : "s"}`}
                >
                  {
                    item.keyword
                  }

                  <small>
                    {
                      item.mentions
                    }×
                  </small>
                </span>
              )
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
