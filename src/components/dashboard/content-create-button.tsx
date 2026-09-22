"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";

import styles from "./content-create-button.module.css";

type Stage =
  | "IDLE"
  | "PLANNING"
  | "WRITING";

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

  const busy =
    stage !== "IDLE";

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
        throw new Error(
          briefJson.error ??
            "Growth OS could not build the content plan."
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
          setError(null);
          setOpen(true);
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
              styles.dialog
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
                onChange={(
                  event
                ) =>
                  setTopic(
                    event
                      .target
                      .value
                  )
                }
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
                    busy
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
