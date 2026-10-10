import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSerpReplayArticleFingerprintV1,
} from "./serp-replay-fingerprint";

import {
  assertExplicitPublishGatePassedV1,
  evaluateExplicitPublishGateV1,
} from "./publish-gate";


const article = {
  title:
    "What Is Credit Monitoring?",

  metaDescription:
    "A factual guide to credit monitoring.",

  h1:
    "What Is Credit Monitoring?",

  bodyMarkdown:
    "## How it works\n\nAccepted article body.",
};


function replayArtifact(
  overrides:
    Record<
      string,
      unknown
    > = {}
) {
  return {
    id:
      "replay-1",

    executionStatus:
      "SUCCEEDED",

    replayStatus:
      "READY",

    articleFingerprint:
      buildSerpReplayArticleFingerprintV1(
        article
      ),

    articleFingerprintAlgo:
      "SHA256_V1",

    createdAt:
      new Date(
        "2026-09-22T02:00:00.000Z"
      ),

    ...overrides,
  } as any;
}


function evaluate(
  overrides:
    Record<
      string,
      unknown
    > = {}
) {
  return evaluateExplicitPublishGateV1({
    article,

    replayArtifact:
      replayArtifact(),

    existingGates: {
      contentGatePassed:
        true,

      publicationPolicyPassed:
        true,
    },

    ...overrides,
  } as any);
}


describe(
  "Explicit Publish Gate V1",
  () => {
    it(
      "passes the exact unchanged article with a successful stored replay and existing gates passed",
      () => {
        const result =
          evaluate();


        expect(
          result.pass
        ).toBe(
          true
        );

        expect(
          result.blockers
        ).toEqual(
          []
        );

        expect(
          result.masterCriticAcceptanceProvenance
        ).toBe(
          "PROVEN_BY_MATCHING_POST_CRITIC_REPLAY"
        );
      }
    );


    it(
      "blocks when the replay artifact is missing",
      () => {
        const result =
          evaluate({
            replayArtifact:
              null,
          });


        expect(
          result.pass
        ).toBe(
          false
        );

        expect(
          result.blockers.map(
            (blocker) =>
              blocker.code
          )
        ).toContain(
          "SERP_REPLAY_MISSING"
        );
      }
    );


    it(
      "blocks when the latest replay execution failed",
      () => {
        const result =
          evaluate({
            replayArtifact:
              replayArtifact({
                executionStatus:
                  "FAILED",

                replayStatus:
                  null,
              }),
          });


        expect(
          result.blockers.map(
            (blocker) =>
              blocker.code
          )
        ).toContain(
          "SERP_REPLAY_EXECUTION_FAILED"
        );
      }
    );


    it(
      "blocks when the article changed after replay",
      () => {
        const result =
          evaluateExplicitPublishGateV1({
            article: {
              ...article,

              bodyMarkdown:
                `${article.bodyMarkdown}\n\nEdited after replay.`,
            },

            replayArtifact:
              replayArtifact(),

            existingGates: {
              contentGatePassed:
                true,

              publicationPolicyPassed:
                true,
            },
          });


        expect(
          result.blockers.map(
            (blocker) =>
              blocker.code
          )
        ).toContain(
          "SERP_REPLAY_ARTICLE_FINGERPRINT_MISMATCH"
        );

        expect(
          result.masterCriticAcceptanceProvenance
        ).toBe(
          "UNPROVEN"
        );
      }
    );


    it(
      "blocks an internally inconsistent successful replay without replayStatus",
      () => {
        const result =
          evaluate({
            replayArtifact:
              replayArtifact({
                replayStatus:
                  null,
              }),
          });


        expect(
          result.blockers.map(
            (blocker) =>
              blocker.code
          )
        ).toContain(
          "SERP_REPLAY_STATUS_MISSING"
        );
      }
    );


    it(
      "reuses existing content gate result instead of reimplementing it",
      () => {
        const result =
          evaluate({
            existingGates: {
              contentGatePassed:
                false,

              publicationPolicyPassed:
                true,
            },
          });


        expect(
          result.blockers.map(
            (blocker) =>
              blocker.code
          )
        ).toContain(
          "CONTENT_GATE_FAILED"
        );
      }
    );


    it(
      "reuses existing publication policy result instead of reimplementing it",
      () => {
        const result =
          evaluate({
            existingGates: {
              contentGatePassed:
                true,

              publicationPolicyPassed:
                false,
            },
          });


        expect(
          result.blockers.map(
            (blocker) =>
              blocker.code
          )
        ).toContain(
          "PUBLICATION_POLICY_FAILED"
        );
      }
    );


    it(
      "keeps SERP Replay BLOCK diagnostic rather than treating it as ranking failure",
      () => {
        const result =
          evaluate({
            replayArtifact:
              replayArtifact({
                replayStatus:
                  "BLOCK",
              }),
          });


        expect(
          result.pass
        ).toBe(
          true
        );

        expect(
          result.warnings.map(
            (warning) =>
              warning.code
          )
        ).toContain(
          "SERP_REPLAY_DIAGNOSTIC_BLOCK"
        );
      }
    );


    it(
      "keeps insufficient SERP context diagnostic",
      () => {
        const result =
          evaluate({
            replayArtifact:
              replayArtifact({
                replayStatus:
                  "INSUFFICIENT_CONTEXT",
              }),
          });


        expect(
          result.pass
        ).toBe(
          true
        );

        expect(
          result.warnings.map(
            (warning) =>
              warning.code
          )
        ).toContain(
          "SERP_REPLAY_INSUFFICIENT_CONTEXT"
        );
      }
    );


    it(
      "throws a structured gate error on blockers",
      () => {
        const result =
          evaluate({
            replayArtifact:
              null,
          });


        expect(
          () =>
            assertExplicitPublishGatePassedV1(
              result
            )
        ).toThrow(
          "EXPLICIT_PUBLISH_GATE_BLOCKED:SERP_REPLAY_MISSING"
        );
      }
    );
  }
);
