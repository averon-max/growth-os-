import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeMasterRuntimeUrlOwnershipV1,
} from "./master-runtime-url-ownership";


function candidate() {
  return {
    version:
      "URL_OWNERSHIP_V1",

    missionId:
      "mission-1",

    status:
      "SINGLE_OWNER",

    cannibalization:
      "NONE",

    actionHint:
      "UPDATE_CANDIDATE",

    primaryOwnerUrl:
      "https://example.com/existing",

    candidates: [
      {
        url:
          "https://example.com/existing",

        matchedQueries: [
          "what is credit monitoring",
        ],

        intentMatch:
          true,

        queryOverlap:
          1,

        matchedImpressions:
          420,

        missionAffinity:
          0.92,
      },
    ],

    targetQueries: [
      "what is credit monitoring",
    ],

    evidence: [
      "SINGLE_GSC_QUERY_OWNER",
      "INTENT_MATCH",
    ],
  };
}


describe(
  "Master Runtime URL Ownership persistence adapter",
  () => {
    it(
      "preserves a real URL_OWNERSHIP_V1 artifact",
      () => {
        const value =
          normalizeMasterRuntimeUrlOwnershipV1(
            candidate()
          );

        expect(
          value?.version
        ).toBe(
          "URL_OWNERSHIP_V1"
        );

        expect(
          value?.missionId
        ).toBe(
          "mission-1"
        );

        expect(
          value?.candidates
        ).toHaveLength(
          1
        );

        expect(
          value?.candidates[
            0
          ]?.url
        ).toBe(
          "https://example.com/existing"
        );
      }
    );


    it(
      "keeps historical missing ownership explicit as null",
      () => {
        expect(
          normalizeMasterRuntimeUrlOwnershipV1(
            undefined
          )
        ).toBeNull();

        expect(
          normalizeMasterRuntimeUrlOwnershipV1(
            null
          )
        ).toBeNull();
      }
    );


    it(
      "rejects invented ownership versions",
      () => {
        expect(
          () =>
            normalizeMasterRuntimeUrlOwnershipV1({
              ...candidate(),

              version:
                "URL_OWNERSHIP_V2",
            })
        ).toThrow(
          "MASTER_RUNTIME_URL_OWNERSHIP_VERSION_INVALID"
        );
      }
    );


    it(
      "rejects malformed ownership candidates",
      () => {
        const value =
          candidate();

        (
          value.candidates[
            0
          ] as any
        ).matchedQueries =
          "fake";

        expect(
          () =>
            normalizeMasterRuntimeUrlOwnershipV1(
              value
            )
        ).toThrow(
          "MASTER_RUNTIME_URL_OWNERSHIP_MATCHED_QUERIES_INVALID"
        );
      }
    );


    it(
      "rejects non-finite ownership metrics",
      () => {
        const value =
          candidate();

        (
          value.candidates[
            0
          ] as any
        ).missionAffinity =
          Number.NaN;

        expect(
          () =>
            normalizeMasterRuntimeUrlOwnershipV1(
              value
            )
        ).toThrow(
          "MASTER_RUNTIME_URL_OWNERSHIP_AFFINITY_INVALID"
        );
      }
    );


    it(
      "freezes normalized ownership and candidate arrays",
      () => {
        const value =
          normalizeMasterRuntimeUrlOwnershipV1(
            candidate()
          );

        expect(
          Object.isFrozen(
            value
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            value?.candidates
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            value?.candidates[
              0
            ]
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            value?.candidates[
              0
            ]?.matchedQueries
          )
        ).toBe(
          true
        );
      }
    );
  }
);
