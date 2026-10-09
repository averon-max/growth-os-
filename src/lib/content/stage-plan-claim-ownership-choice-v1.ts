/*
 * STAGE_PLAN_CLAIM_OWNERSHIP_CHOICE_V1
 *
 * Purpose:
 * resolve duplicate section ownership without guessing ownership in code.
 *
 * This module does NOT decide which section semantically deserves a claim.
 *
 * It only:
 * 1. detects duplicate current owners,
 * 2. exposes the bounded candidate set,
 * 3. validates an externally supplied semantic choice,
 * 4. removes duplicate references from the losing CURRENT owners.
 *
 * Hard invariants:
 * - never create a claim
 * - never edit claim text
 * - never create a section
 * - never move a claim to a section that did not already own it
 * - never use first-owner-wins
 * - never use lexical/fuzzy heading matching
 */


export interface StagePlanOwnershipClaimV1 {
  readonly id:
    string;

  readonly text:
    string;

  readonly category:
    string;
}


export interface StagePlanOwnershipSectionV1 {
  readonly heading:
    string;

  readonly mission:
    string;

  readonly expectedOutcome:
    string;

  readonly roles:
    readonly string[];

  readonly topics:
    readonly string[];

  readonly questions:
    readonly string[];

  readonly requiredClaimIds:
    readonly string[];
}


export interface StagePlanDuplicateClaimOwnerV1 {
  readonly sectionIndex:
    number;

  readonly heading:
    string;

  readonly mission:
    string;

  readonly expectedOutcome:
    string;

  readonly roles:
    readonly string[];

  readonly topics:
    readonly string[];

  readonly questions:
    readonly string[];
}


export interface StagePlanDuplicateClaimOwnershipV1 {
  readonly claimId:
    string;

  readonly claimText:
    string;

  readonly claimCategory:
    string;

  readonly owners:
    readonly StagePlanDuplicateClaimOwnerV1[];
}


export interface StagePlanClaimOwnerChoiceV1 {
  readonly claimId:
    string;

  readonly ownerSectionIndex:
    number;
}


export class StagePlanClaimOwnershipChoiceErrorV1
  extends Error {
  readonly code:
    string;

  constructor(
    code:
      string,
    message:
      string = code
  ) {
    super(
      message
    );

    this.name =
      "StagePlanClaimOwnershipChoiceErrorV1";

    this.code =
      code;
  }
}


export function collectDuplicateStagePlanClaimOwnershipV1({
  claims,
  sections,
}: {
  readonly claims:
    readonly StagePlanOwnershipClaimV1[];

  readonly sections:
    readonly StagePlanOwnershipSectionV1[];
}): readonly StagePlanDuplicateClaimOwnershipV1[] {
  const claimById =
    new Map(
      claims.map(
        (
          claim
        ) => [
          claim.id,
          claim,
        ] as const
      )
    );

  const ownerIndexesByClaimId =
    new Map<
      string,
      number[]
    >();

  for (
    let sectionIndex = 0;
    sectionIndex <
      sections.length;
    sectionIndex += 1
  ) {
    const section =
      sections[
        sectionIndex
      ];

    if (
      !section
    ) {
      continue;
    }

    /*
     * Duplicate IDs inside ONE section do not create multiple owners.
     */
    const uniqueClaimIds =
      [
        ...new Set(
          section
            .requiredClaimIds
        ),
      ];

    for (
      const claimId
      of uniqueClaimIds
    ) {
      const current =
        ownerIndexesByClaimId.get(
          claimId
        ) ??
        [];

      current.push(
        sectionIndex
      );

      ownerIndexesByClaimId.set(
        claimId,
        current
      );
    }
  }

  const conflicts:
    StagePlanDuplicateClaimOwnershipV1[] =
      [];

  for (
    const [
      claimId,
      ownerIndexes,
    ]
    of ownerIndexesByClaimId
  ) {
    if (
      ownerIndexes.length <=
      1
    ) {
      continue;
    }

    const claim =
      claimById.get(
        claimId
      );

    /*
     * Unknown claim IDs remain the responsibility of the existing
     * Stage Plan validity gate. We never fabricate claim semantics.
     */
    if (
      !claim
    ) {
      continue;
    }

    conflicts.push({
      claimId:
        claim.id,

      claimText:
        claim.text,

      claimCategory:
        claim.category,

      owners:
        ownerIndexes.map(
          (
            sectionIndex
          ) => {
            const section =
              sections[
                sectionIndex
              ];

            if (
              !section
            ) {
              throw new StagePlanClaimOwnershipChoiceErrorV1(
                "STAGE_PLAN_OWNER_SECTION_MISSING",
                `Missing current owner section ${sectionIndex} for ${claimId}.`
              );
            }

            return {
              sectionIndex,

              heading:
                section.heading,

              mission:
                section.mission,

              expectedOutcome:
                section
                  .expectedOutcome,

              roles:
                [
                  ...section.roles,
                ],

              topics:
                [
                  ...section.topics,
                ],

              questions:
                [
                  ...section.questions,
                ],
            };
          }
        ),
    });
  }

  return conflicts;
}



export function parseStagePlanClaimOwnerChoicePayloadV1(
  value:
    unknown
): readonly StagePlanClaimOwnerChoiceV1[] {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new StagePlanClaimOwnershipChoiceErrorV1(
      "STAGE_PLAN_OWNER_CHOICE_PAYLOAD_INVALID",
      "Ownership repair output must be an object."
    );
  }

  const choices =
    (
      value as {
        choices?: unknown;
      }
    ).choices;

  if (!Array.isArray(choices)) {
    throw new StagePlanClaimOwnershipChoiceErrorV1(
      "STAGE_PLAN_OWNER_CHOICES_REQUIRED",
      "Ownership repair output must contain choices: array."
    );
  }

  return choices.map(
    (
      raw,
      index
    ) => {
      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw)
      ) {
        throw new StagePlanClaimOwnershipChoiceErrorV1(
          "STAGE_PLAN_OWNER_CHOICE_ITEM_INVALID",
          `Ownership choice ${index} must be an object.`
        );
      }

      const record =
        raw as {
          claimId?: unknown;
          ownerSectionIndex?: unknown;
        };

      if (
        typeof record.claimId !== "string" ||
        !record.claimId.trim()
      ) {
        throw new StagePlanClaimOwnershipChoiceErrorV1(
          "STAGE_PLAN_OWNER_CHOICE_CLAIM_ID_INVALID",
          `Ownership choice ${index} has invalid claimId.`
        );
      }

      if (
        typeof record.ownerSectionIndex !== "number" ||
        !Number.isInteger(record.ownerSectionIndex) ||
        record.ownerSectionIndex < 0
      ) {
        throw new StagePlanClaimOwnershipChoiceErrorV1(
          "STAGE_PLAN_OWNER_CHOICE_SECTION_INDEX_INVALID",
          `Ownership choice ${index} has invalid ownerSectionIndex.`
        );
      }

      return {
        claimId:
          record.claimId.trim(),

        ownerSectionIndex:
          record.ownerSectionIndex,
      };
    }
  );
}



export function applyStagePlanClaimOwnerChoicesV1<
  TSection extends
    StagePlanOwnershipSectionV1,
>({
  sections,
  conflicts,
  choices,
}: {
  readonly sections:
    readonly TSection[];

  readonly conflicts:
    readonly StagePlanDuplicateClaimOwnershipV1[];

  readonly choices:
    readonly StagePlanClaimOwnerChoiceV1[];
}): readonly TSection[] {
  const conflictByClaimId =
    new Map(
      conflicts.map(
        (
          conflict
        ) => [
          conflict.claimId,
          conflict,
        ] as const
      )
    );

  const choiceByClaimId =
    new Map<
      string,
      StagePlanClaimOwnerChoiceV1
    >();

  for (
    const choice
    of choices
  ) {
    if (
      choiceByClaimId.has(
        choice.claimId
      )
    ) {
      throw new StagePlanClaimOwnershipChoiceErrorV1(
        "STAGE_PLAN_OWNER_CHOICE_DUPLICATE",
        `Duplicate ownership choice for ${choice.claimId}.`
      );
    }

    const conflict =
      conflictByClaimId.get(
        choice.claimId
      );

    if (
      !conflict
    ) {
      throw new StagePlanClaimOwnershipChoiceErrorV1(
        "STAGE_PLAN_OWNER_CHOICE_UNKNOWN_CONFLICT",
        `Ownership choice references a non-conflicting claim: ${choice.claimId}.`
      );
    }

    const validCurrentOwner =
      conflict.owners.some(
        (
          owner
        ) =>
          owner.sectionIndex ===
          choice.ownerSectionIndex
      );

    if (
      !validCurrentOwner
    ) {
      throw new StagePlanClaimOwnershipChoiceErrorV1(
        "STAGE_PLAN_OWNER_CHOICE_NOT_CURRENT_OWNER",
        `Chosen section ${choice.ownerSectionIndex} is not a current owner of ${choice.claimId}.`
      );
    }

    choiceByClaimId.set(
      choice.claimId,
      choice
    );
  }

  /*
   * A repair output must resolve every supplied conflict.
   * Partial repairs are rejected rather than silently accepted.
   */
  for (
    const conflict
    of conflicts
  ) {
    if (
      !choiceByClaimId.has(
        conflict.claimId
      )
    ) {
      throw new StagePlanClaimOwnershipChoiceErrorV1(
        "STAGE_PLAN_OWNER_CHOICE_MISSING",
        `No ownership choice was returned for ${conflict.claimId}.`
      );
    }
  }

  return sections.map(
    (
      section,
      sectionIndex
    ) => {
      let requiredClaimIds =
        [
          ...section
            .requiredClaimIds,
        ];

      for (
        const conflict
        of conflicts
      ) {
        const choice =
          choiceByClaimId.get(
            conflict.claimId
          );

        if (
          !choice
        ) {
          throw new StagePlanClaimOwnershipChoiceErrorV1(
            "STAGE_PLAN_OWNER_CHOICE_INTERNAL_MISSING"
          );
        }

        const wasCurrentOwner =
          conflict.owners.some(
            (
              owner
            ) =>
              owner.sectionIndex ===
              sectionIndex
          );

        if (
          !wasCurrentOwner ||
          choice.ownerSectionIndex ===
            sectionIndex
        ) {
          continue;
        }

        requiredClaimIds =
          requiredClaimIds.filter(
            (
              claimId
            ) =>
              claimId !==
              conflict.claimId
          );
      }

      return {
        ...section,

        requiredClaimIds,
      };
    }
  );
}
