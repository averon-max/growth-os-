import {
  describe,
  expect,
  it,
} from "vitest";

import {
  StagePlanClaimOwnershipChoiceErrorV1,
  applyStagePlanClaimOwnerChoicesV1,
  collectDuplicateStagePlanClaimOwnershipV1,
} from "./stage-plan-claim-ownership-choice-v1";


function fixture() {
  const claims =
    [
      {
        id:
          "claim-coverage-varies",

        text:
          "Monitoring coverage can vary between services.",

        /*
         * Deliberately FACT.
         *
         * Runtime ownership correctness must NOT depend on the LLM
         * consistently assigning COMPARISON here.
         */
        category:
          "FACT",
      },

      {
        id:
          "claim-definition",

        text:
          "Credit monitoring watches for changes.",

        category:
          "FACT",
      },
    ];

  const sections =
    [
      {
        heading:
          "Important limitations",

        mission:
          "Explain important monitoring limitations.",

        expectedOutcome:
          "Reader understands limits.",

        roles:
          [
            "LIMITATION",
          ],

        topics:
          [
            "Monitoring limitations",
          ],

        questions:
          [],

        requiredClaimIds:
          [
            "claim-coverage-varies",
          ],
      },

      {
        heading:
          "Service tradeoffs",

        mission:
          "Help the reader evaluate service differences.",

        expectedOutcome:
          "Reader understands tradeoffs.",

        roles:
          [
            "DECISION_SUPPORT",
          ],

        topics:
          [
            "Service tradeoffs",
          ],

        questions:
          [
            "What should I compare?",
          ],

        requiredClaimIds:
          [
            "claim-coverage-varies",
          ],
      },

      {
        heading:
          "Definition",

        mission:
          "Define credit monitoring.",

        expectedOutcome:
          "Reader understands the term.",

        roles:
          [
            "DEFINITION",
          ],

        topics:
          [
            "Definition",
          ],

        questions:
          [],

        requiredClaimIds:
          [
            "claim-definition",
          ],
      },
    ];

  return {
    claims,
    sections,
  };
}


describe(
  "Stage Plan claim ownership choice V1",
  () => {
    it(
      "detects duplicate current owners without choosing one",
      () => {
        const {
          claims,
          sections,
        } =
          fixture();

        const conflicts =
          collectDuplicateStagePlanClaimOwnershipV1({
            claims,
            sections,
          });

        expect(
          conflicts
        ).toHaveLength(
          1
        );

        expect(
          conflicts[
            0
          ]?.claimId
        ).toBe(
          "claim-coverage-varies"
        );

        expect(
          conflicts[
            0
          ]?.claimCategory
        ).toBe(
          "FACT"
        );

        expect(
          conflicts[
            0
          ]?.owners.map(
            (
              owner
            ) =>
              owner.sectionIndex
          )
        ).toEqual([
          0,
          1,
        ]);
      }
    );


    it(
      "applies a validated choice only among existing owners",
      () => {
        const {
          claims,
          sections,
        } =
          fixture();

        const conflicts =
          collectDuplicateStagePlanClaimOwnershipV1({
            claims,
            sections,
          });

        const result =
          applyStagePlanClaimOwnerChoicesV1({
            sections,
            conflicts,

            choices:
              [
                {
                  claimId:
                    "claim-coverage-varies",

                  ownerSectionIndex:
                    1,
                },
              ],
          });

        expect(
          result[
            0
          ]?.requiredClaimIds
        ).toEqual([]);

        expect(
          result[
            1
          ]?.requiredClaimIds
        ).toEqual([
          "claim-coverage-varies",
        ]);

        expect(
          result[
            2
          ]?.requiredClaimIds
        ).toEqual([
          "claim-definition",
        ]);

        /*
         * Input remains untouched.
         */
        expect(
          sections[
            0
          ]?.requiredClaimIds
        ).toEqual([
          "claim-coverage-varies",
        ]);
      }
    );


    it(
      "rejects moving the claim to a section that never owned it",
      () => {
        const {
          claims,
          sections,
        } =
          fixture();

        const conflicts =
          collectDuplicateStagePlanClaimOwnershipV1({
            claims,
            sections,
          });

        expect(
          () =>
            applyStagePlanClaimOwnerChoicesV1({
              sections,
              conflicts,

              choices:
                [
                  {
                    claimId:
                      "claim-coverage-varies",

                    ownerSectionIndex:
                      2,
                  },
                ],
            })
        ).toThrow(
          StagePlanClaimOwnershipChoiceErrorV1
        );
      }
    );


    it(
      "rejects a partial repair",
      () => {
        const {
          claims,
          sections,
        } =
          fixture();

        const conflicts =
          collectDuplicateStagePlanClaimOwnershipV1({
            claims,
            sections,
          });

        expect(
          () =>
            applyStagePlanClaimOwnerChoicesV1({
              sections,
              conflicts,
              choices:
                [],
            })
        ).toThrow(
          "No ownership choice was returned"
        );
      }
    );


    it(
      "rejects a choice for a non-conflicting claim",
      () => {
        const {
          claims,
          sections,
        } =
          fixture();

        const conflicts =
          collectDuplicateStagePlanClaimOwnershipV1({
            claims,
            sections,
          });

        expect(
          () =>
            applyStagePlanClaimOwnerChoicesV1({
              sections,
              conflicts,

              choices:
                [
                  {
                    claimId:
                      "claim-definition",

                    ownerSectionIndex:
                      2,
                  },
                ],
            })
        ).toThrow(
          "non-conflicting claim"
        );
      }
    );


    it(
      "does not report normal single ownership as a conflict",
      () => {
        const {
          claims,
          sections,
        } =
          fixture();

        const conflicts =
          collectDuplicateStagePlanClaimOwnershipV1({
            claims,
            sections,
          });

        expect(
          conflicts.some(
            (
              conflict
            ) =>
              conflict.claimId ===
              "claim-definition"
          )
        ).toBe(
          false
        );
      }
    );
  }
);


describe(
  "Stage Plan owner choice model boundary",
  () => {
    it(
      "accepts valid bounded owner choices",
      async () => {
        const {
          parseStagePlanClaimOwnerChoicePayloadV1,
        } =
          await import(
            "./stage-plan-claim-ownership-choice-v1"
          );

        expect(
          parseStagePlanClaimOwnerChoicePayloadV1({
            choices:
              [
                {
                  claimId:
                    "claim-1",

                  ownerSectionIndex:
                    1,
                },
              ],
          })
        ).toEqual([
          {
            claimId:
              "claim-1",

            ownerSectionIndex:
              1,
          },
        ]);
      }
    );


    it(
      "rejects malformed model output",
      async () => {
        const {
          parseStagePlanClaimOwnerChoicePayloadV1,
        } =
          await import(
            "./stage-plan-claim-ownership-choice-v1"
          );

        expect(
          () =>
            parseStagePlanClaimOwnerChoicePayloadV1({
              choices:
                [
                  {
                    claimId:
                      "",

                    ownerSectionIndex:
                      0,
                  },
                ],
            })
        ).toThrow(
          "invalid claimId"
        );

        expect(
          () =>
            parseStagePlanClaimOwnerChoicePayloadV1({
              choices:
                [
                  {
                    claimId:
                      "claim-1",

                    ownerSectionIndex:
                      1.5,
                  },
                ],
            })
        ).toThrow(
          "invalid ownerSectionIndex"
        );
      }
    );
  }
);
