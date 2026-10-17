/**
 * Deterministic ownership inspection of planned topics and questions.
 * Preserves exact-string identities and reports problems without mutation.
 * Extracted verbatim from production-master-live-stage-planner.ts.
 */
import type { StagePlanModelOutput } from "./production-master-live-stage-planner";

/*
 * STAGE_PLAN_COVERAGE_OWNERSHIP_RECOVERY_V1
 *
 * Detection only.
 *
 * Canonical topic/question identity remains exact-string based.
 * This does NOT fuzzy-match, silently reassign, normalize into a
 * replacement identity, or mutate plan.questions / plan.topics from
 * child section data.
 *
 * Coverage ownership drift is detected early enough to enter the
 * ONE existing bounded full Stage Plan regeneration. The existing
 * deterministic ownership gate remains the final fail-closed authority.
 */
export function inspectStagePlanCoverageOwnership(
  plan: StagePlanModelOutput
): string[] {
  const issues:
    string[] =
      [];

  if (
    !Array.isArray(
      plan.topics
    ) ||
    !Array.isArray(
      plan.questions
    ) ||
    !Array.isArray(
      plan.sections
    )
  ) {
    return issues;
  }

  const plannedTopics =
    [
      ...new Set(
        plan.topics
          .map(
            (
              topic
            ) =>
              typeof topic?.topic ===
              "string"
                ? topic.topic.trim()
                : ""
          )
          .filter(Boolean)
      ),
    ];

  const plannedQuestions =
    [
      ...new Set(
        plan.questions
          .map(
            (
              question
            ) =>
              typeof question ===
              "string"
                ? question.trim()
                : ""
          )
          .filter(Boolean)
      ),
    ];

  const knownTopics =
    new Set(
      plannedTopics
    );

  const knownQuestions =
    new Set(
      plannedQuestions
    );

  const topicOwnerCount =
    new Map<
      string,
      number
    >(
      plannedTopics.map(
        (
          topic
        ): [
          string,
          number
        ] => [
          topic,
          0,
        ]
      )
    );

  const questionOwnerCount =
    new Map<
      string,
      number
    >(
      plannedQuestions.map(
        (
          question
        ): [
          string,
          number
        ] => [
          question,
          0,
        ]
      )
    );

  for (
    const section
    of plan.sections
  ) {
    const ownedTopics =
      Array.isArray(
        section.topics
      )
        ? [
            ...new Set(
              section.topics
                .map(
                  (
                    topic
                  ) =>
                    typeof topic ===
                    "string"
                      ? topic.trim()
                      : ""
                )
                .filter(Boolean)
            ),
          ]
        : [];

    const ownedQuestions =
      Array.isArray(
        section.questions
      )
        ? [
            ...new Set(
              section.questions
                .map(
                  (
                    question
                  ) =>
                    typeof question ===
                    "string"
                      ? question.trim()
                      : ""
                )
                .filter(Boolean)
            ),
          ]
        : [];

    for (
      const topic
      of ownedTopics
    ) {
      if (
        !knownTopics.has(
          topic
        )
      ) {
        issues.push(
          `sections[].topics unknown:${topic}`
        );

        continue;
      }

      topicOwnerCount.set(
        topic,
        (
          topicOwnerCount.get(
            topic
          ) ??
          0
        ) +
          1
      );
    }

    for (
      const question
      of ownedQuestions
    ) {
      if (
        !knownQuestions.has(
          question
        )
      ) {
        issues.push(
          `sections[].questions unknown:${question}`
        );

        continue;
      }

      questionOwnerCount.set(
        question,
        (
          questionOwnerCount.get(
            question
          ) ??
          0
        ) +
          1
      );
    }
  }

  for (
    const [
      topic,
      owners,
    ]
    of topicOwnerCount
  ) {
    if (
      owners ===
      0
    ) {
      issues.push(
        `plan.topics unowned:${topic}`
      );
    } else if (
      owners >
      1
    ) {
      issues.push(
        `plan.topics multiple-owners:${topic}`
      );
    }
  }

  for (
    const [
      question,
      owners,
    ]
    of questionOwnerCount
  ) {
    if (
      owners ===
      0
    ) {
      issues.push(
        `plan.questions unowned:${question}`
      );
    } else if (
      owners >
      1
    ) {
      issues.push(
        `plan.questions multiple-owners:${question}`
      );
    }
  }

  return issues;
}


