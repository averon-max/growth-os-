import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSectionScopedAuthorityContextV1,
} from "./master-section-context";


describe(
  "section evidence authority closure V1",
  () => {
    it(
      "never exposes evidence outside blueprint.evidenceIds even when the evidence belongs to a section-relevant claim",
      () => {
        const contract = {
          sectionIndex:
            1,

          sectionNumber:
            2,

          totalSections:
            2,

          blueprint: {
            heading:
              "How credit monitoring works",

            mission:
              "Explain how credit monitoring works.",

            queryNodeIds:
              [],

            requiredClaims: [
              "claim-1",
            ],

            forbiddenClaims:
              [],

            evidenceIds: [
              "evidence-allowed",
            ],

            internalLinks:
              [],

            asset:
              "asset-1",
          },

          queryGraph: {
            missionIntent:
              "INFORMATIONAL",

            nodes:
              [],
          },

          claimLedger: {
            claims: [
              {
                id:
                  "claim-1",

                text:
                  "Assigned claim",

                category:
                  "FACT",

                risk:
                  "LOW",

                status:
                  "VERIFIED",

                evidenceIds: [
                  "evidence-allowed",

                  /*
                   * Same claim.
                   * NOT assigned to this section.
                   */
                  "evidence-unassigned",
                ],
              },
            ],
          },

          evidenceGraph: {
            claimEvidence: [
              {
                id:
                  "evidence-allowed",

                claimId:
                  "claim-1",

                sourceId:
                  "source-allowed",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Allowed evidence.",
              },

              {
                id:
                  "evidence-unassigned",

                /*
                 * This is the exact regression:
                 * same relevant claim, but evidence ID is not
                 * present in blueprint.evidenceIds.
                 */
                claimId:
                  "claim-1",

                sourceId:
                  "source-unassigned",

                relation:
                  "SUPPORTS",

                kind:
                  "VERIFIED_EXCERPT",

                excerpt:
                  "Unassigned evidence.",
              },
            ],

            sources: [
              {
                id:
                  "source-allowed",

                url:
                  "https://example.com/allowed",
              },

              {
                id:
                  "source-unassigned",

                url:
                  "https://example.com/unassigned",
              },
            ],
          },

          originalValue: {
            assets: [
              {
                id:
                  "asset-1",

                type:
                  "TABLE",

                title:
                  "Assigned asset",

                firstParty:
                  true,

                verified:
                  true,

                evidenceIds: [
                  "evidence-allowed",
                  "evidence-unassigned",
                ],
              },
            ],
          },

          internalLinkPlan:
            [],

          searchBlueprint:
            {},

          mission:
            {},

          styleRules:
            [],

          hardRules:
            [],
        } as never;


        const context =
          buildSectionScopedAuthorityContextV1(
            contract
          );


        const serialized =
          JSON.stringify(
            context
          );


        expect(
          serialized
        ).toContain(
          "evidence-allowed"
        );


        expect(
          serialized
        ).toContain(
          "source-allowed"
        );


        /*
         * Absolute provider-context boundary.
         *
         * The model must have no way to learn this ID from the
         * section authority payload.
         */
        expect(
          serialized
        ).not.toContain(
          "evidence-unassigned"
        );


        expect(
          serialized
        ).not.toContain(
          "source-unassigned"
        );


        const typed =
          context as {
            claimLedger?: {
              claims?: Array<{
                evidenceIds?: string[];
              }>;
            };

            evidenceGraph?: {
              claimEvidence?: Array<{
                id?: string;
              }>;

              sources?: Array<{
                id?: string;
              }>;
            };

            originalValue?: {
              assets?: Array<{
                evidenceIds?: string[];
              }>;
            };
          };


        expect(
          typed
            .claimLedger
            ?.claims?.[0]
            ?.evidenceIds
        ).toEqual([
          "evidence-allowed",
        ]);


        expect(
          typed
            .evidenceGraph
            ?.claimEvidence
            ?.map(
              (
                item
              ) =>
                item.id
            )
        ).toEqual([
          "evidence-allowed",
        ]);


        expect(
          typed
            .evidenceGraph
            ?.sources
            ?.map(
              (
                item
              ) =>
                item.id
            )
        ).toEqual([
          "source-allowed",
        ]);


        expect(
          typed
            .originalValue
            ?.assets?.[0]
            ?.evidenceIds
        ).toEqual([
          "evidence-allowed",
        ]);
      }
    );
  }
);
