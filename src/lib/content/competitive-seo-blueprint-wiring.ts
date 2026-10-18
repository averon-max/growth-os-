import type {
  CompetitiveGapV2,
} from "./competitive-gap-v2";

import type {
  SerpConsensusV2,
} from "./serp-consensus-v2";


interface MasterBlueprintInputLike {
  questions?:
    string[];

  competitorStrengths?:
    string[];

  competitorWeaknesses?:
    string[];

  technicalRequirements?:
    string[];
}


function unique(
  values:
    readonly string[]
): string[] {
  const seen =
    new Set<string>();

  const output:
    string[] =
      [];

  for (
    const raw
    of values
  ) {
    const value =
      raw.trim();

    const key =
      value
        .toLowerCase();

    if (
      !value ||
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    output.push(
      value
    );
  }

  return output;
}


export function applyCompetitiveSeoToMasterBlueprintV2<
  T extends
    MasterBlueprintInputLike
>({
  input,
  consensus,
  competitiveGap,
}: {
  input:
    T;

  consensus:
    Readonly<
      SerpConsensusV2
    >;

  competitiveGap:
    Readonly<
      CompetitiveGapV2
    >;
}): T {
  /*
   * No usable SERP sample => no invented competitive signals.
   */
  if (
    consensus.analyzedResultCount ===
      0
  ) {
    return input;
  }


  const competitorStrengths =
    unique([
      ...(
        input
          .competitorStrengths ??
        []
      ),

      ...competitiveGap
        .consensusStrengths,
    ]);


  const competitorWeaknesses =
    unique([
      ...(
        input
          .competitorWeaknesses ??
        []
      ),

      ...(
        consensus
          .analyzedResultCount >=
        3
          ? competitiveGap
              .lowConsensusMissionTopics
              .map(
                (
                  topic
                ) =>
                  `Low-consensus competitor coverage for mission topic: ${topic}`
              )
          : []
      ),
    ]);


  const questions =
    unique([
      ...(
        input.questions ??
        []
      ),

      ...competitiveGap
        .recurringQuestions,
    ]);


  const technicalRequirements =
    unique([
      ...(
        input
          .technicalRequirements ??
        []
      ),

      "SERP_CONSENSUS_V2",

      `SERP_CONSENSUS_CONFIDENCE:${consensus.confidence}`,

      "Use recurring SERP signals to understand user information jobs, not to copy competitor wording.",

      "Observed competitor word counts are not content-length targets.",

      "Observed competitor heading counts are not heading-count targets.",

      "Recurring SERP topics outside mission coverage are review signals only and must not silently expand the Search Mission.",

      ...competitiveGap
        .reviewOnlyConsensusTopics
        .slice(
          0,
          8
        )
        .map(
          (
            topic
          ) =>
            `SERP_REVIEW_TOPIC:${topic}`
        ),

      ...competitiveGap
        .recurringEntities
        .slice(
          0,
          8
        )
        .map(
          (
            entity
          ) =>
            `SERP_RECURRING_ENTITY:${entity}`
        ),
      // Review-only observations: NEVER convert repeated competitor
      // vocabulary into unsupported claims or mandatory keyword quotas.
      ...(consensus.bodyTermThemes ?? [])
        .filter(term => term.supportCount >= 3)
        .slice(0, 10)
        .map(term => `SERP_BODY_TERM_REVIEW:${term.value}`),
    ]);


  return {
    ...input,

    questions,

    competitorStrengths,

    competitorWeaknesses,

    technicalRequirements,
  };
}
