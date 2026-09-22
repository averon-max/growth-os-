"use client";

import {
  useState,
} from "react";

import styles from "./outcome-action-resume-panel.module.css";

type ResumeAction = {
  id: string;
  keywordText: string;
  decision:
    | "CREATE"
    | "UPDATE"
    | "SKIP";
  status: string;
  compatibilityStatus:
    | "SUPPORTED"
    | "EDUCATIONAL_ONLY"
    | "UNVERIFIED"
    | "CONFLICT";
  compatibilityReason: string;
};

export function OutcomeActionResumePanel({
  websiteId,
  initialAction,
}: {
  websiteId:
    string;

  initialAction:
    ResumeAction;
}) {
  const [
    action,
    setAction,
  ] =
    useState(
      initialAction
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const continuePlan =
    async () => {
      if (
        busy
      ) {
        return;
      }

      setBusy(
        true
      );

      setError(
        null
      );

      try {
        const refreshResponse =
          await fetch(
            `/api/keywords/outcome-actions/${encodeURIComponent(
              action.id
            )}/refresh-compatibility`,
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

        const refreshData =
          await refreshResponse.json() as {
            action?:
              ResumeAction;

            error?:
              string;
          };

        if (
          !refreshResponse.ok ||
          !refreshData.action
        ) {
          throw new Error(
            refreshData.error ??
              "Не удалось проверить данные бизнеса."
          );
        }

        const refreshed =
          refreshData.action;

        setAction(
          refreshed
        );

        if (
          refreshed.compatibilityStatus ===
          "UNVERIFIED"
        ) {
          setError(
            "Подтверждения пока недостаточно. Проверьте Business Facts ниже и подтвердите только факты с реальными доказательствами."
          );

          return;
        }

        if (
          refreshed.compatibilityStatus ===
          "CONFLICT"
        ) {
          setError(
            "Проверенные данные бизнеса противоречат этому плану. Growth OS не будет создавать страницу."
          );

          return;
        }

        if (
          refreshed.decision !==
          "CREATE"
        ) {
          setError(
            "Этот план не создаёт новую страницу. Для UPDATE будет использован отдельный безопасный workflow."
          );

          return;
        }

        const briefResponse =
          await fetch(
            `/api/keywords/outcome-actions/${encodeURIComponent(
              refreshed.id
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

        const briefData =
          await briefResponse.json() as {
            brief?: {
              id: string;
            };

            error?: string;
          };

        if (
          !briefResponse.ok ||
          !briefData.brief
        ) {
          throw new Error(
            briefData.error ??
              "Не удалось подготовить страницу."
          );
        }

        window.location.href =
          `/dashboard/content?websiteId=${encodeURIComponent(
            websiteId
          )}`;
      } catch (
        err
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось продолжить план."
        );
      } finally {
        setBusy(
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
          styles.copy
        }
      >
        <div
          className={
            styles.eyebrow
          }
        >
          План из Keywords
        </div>

        <strong
          className={
            styles.title
          }
        >
          {action.keywordText}
        </strong>

        <span
          className={
            styles.description
          }
        >
          Подтвердите нужные данные бизнеса ниже, затем продолжите этот же план без повторного SEO-анализа.
        </span>
      </div>

      <div
        className={
          styles.actions
        }
      >
        <span
          className={
            styles.status
          }
        >
          {
            action.compatibilityStatus ===
            "SUPPORTED"
              ? "Данные подтверждены"
              : action.compatibilityStatus ===
                  "EDUCATIONAL_ONLY"
                ? "Только образовательный материал"
                : action.compatibilityStatus ===
                    "CONFLICT"
                  ? "Есть конфликт"
                  : "Нужно подтверждение"
          }
        </span>

        <button
          type="button"
          className={
            styles.button
          }
          disabled={
            busy
          }
          onClick={
            () => {
              void continuePlan();
            }
          }
        >
          {
            busy
              ? "Проверяем…"
              : "Продолжить план"
          }
        </button>
      </div>

      {
        error && (
          <div
            className={
              styles.error
            }
          >
            {error}
          </div>
        )
      }
    </div>
  );
}
