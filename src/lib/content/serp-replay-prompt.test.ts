import {
  describe,
  expect,
  it,
} from "vitest";

import {
  SERP_REPLAY_DIMENSIONS,
  type SerpReplayPairwiseInputV1,
} from "./serp-replay";

import {
  buildSerpReplayPairwisePrompt,
  parseSerpReplayPairwiseCandidateV1,
} from "./serp-replay-prompt";


function input():
SerpReplayPairwiseInputV1 {
  return {
    version:
      "SERP_REPLAY_PAIRWISE_INPUT_V1",

    keyword:
      "what is credit monitoring",

    snapshotFingerprint:
      "serp-fingerprint",

    article: {
      title:
        "What Is Credit Monitoring?",

      h1:
        "What Is Credit Monitoring?",

      bodyMarkdown:
        "Accepted article body.",

      sections: [
        {
          sectionIndex:
            0,

          heading:
            "How Credit Monitoring Works",

          bodyMarkdown:
            "Section body.",

          coveredQueryNodeIds: [
            "query-1",
          ],

          referencedClaimIds: [
            "claim-1",
          ],

          referencedEvidenceIds: [
            "evidence-1",
          ],

          assetUsed:
            "asset-1",
        },
      ],

      evidenceCatalog: [
        {
          id:
            "ARTICLE_H1",

          text:
            "What Is Credit Monitoring?",
        },

        {
          id:
            "ARTICLE_EVIDENCE:evidence-1",

          text:
            "Verified excerpt.",
        },

        {
          id:
            "ARTICLE_ASSET:asset-1",

          text:
            "Verified original diagram.",
        },
      ],
    },

    competitor: {
      rank:
        1,

      url:
        "https://famous-brand.example/guide",

      domain:
        "famous-brand.example",

      title:
        "Credit Monitoring Guide",

      snippet:
        "Observed snippet.",

      pageType:
        "GUIDE",

      intent:
        "INFORMATIONAL",

      evidenceCatalog: [
        {
          id:
            "COMPETITOR_H1",

          text:
            "Credit Monitoring Guide",
        },

        {
          id:
            "COMPETITOR_SOURCE:0",

          text:
            "Observed source",
        },
      ],
    },
  };
}


function validCandidate() {
  return {
    dimensions:
      SERP_REPLAY_DIMENSIONS.map(
        (dimension) => ({
          dimension,

          verdict:
            "MIXED",

          reason:
            "Both sides have relevant supplied evidence.",

          articleEvidenceIds: [
            "ARTICLE_H1",
          ],

          competitorEvidenceIds: [
            "COMPETITOR_H1",
          ],

          missingData:
            [],
        })
      ),
  };
}


describe(
  "SERP Replay Pairwise Prompt",
  () => {
    it(
      "withholds SERP rank from the comparison payload",
      () => {
        const prompt =
          buildSerpReplayPairwisePrompt(
            input()
          );


        expect(
          prompt
        ).not.toContain(
          '"rank": 1'
        );


        expect(
          prompt
        ).toContain(
          "SERP rank is intentionally withheld"
        );
      }
    );


    it(
      "forbids numeric SEO scoring and ranking prediction",
      () => {
        const prompt =
          buildSerpReplayPairwisePrompt(
            input()
          );


        expect(
          prompt
        ).toContain(
          "Do not estimate ranking probability."
        );

        expect(
          prompt
        ).toContain(
          "Do not produce an SEO score"
        );

        expect(
          prompt
        ).toContain(
          "Do not add a ranking prediction."
        );
      }
    );


    it(
      "forbids brand rank word-count and backlink bias",
      () => {
        const prompt =
          buildSerpReplayPairwisePrompt(
            input()
          );


        expect(
          prompt
        ).toContain(
          "Do not assume the higher-ranking URL has better content."
        );

        expect(
          prompt
        ).toContain(
          "Do not use brand fame"
        );

        expect(
          prompt
        ).toContain(
          "Do not use word count as evidence"
        );

        expect(
          prompt
        ).toContain(
          "Do not use backlinks or referring-domain counts"
        );
      }
    );


    it(
      "requires closed-world evidence IDs and explicit missing data",
      () => {
        const prompt =
          buildSerpReplayPairwisePrompt(
            input()
          );


        expect(
          prompt
        ).toContain(
          "Evidence IDs are closed-world identifiers."
        );

        expect(
          prompt
        ).toContain(
          "INSUFFICIENT_EVIDENCE"
        );

        expect(
          prompt
        ).toContain(
          "state exactly what data is missing"
        );
      }
    );


    it(
      "includes all six dimensions exactly as the replay contract defines them",
      () => {
        const prompt =
          buildSerpReplayPairwisePrompt(
            input()
          );


        for (
          const dimension
          of SERP_REPLAY_DIMENSIONS
        ) {
          expect(
            prompt
          ).toContain(
            dimension
          );
        }
      }
    );
  }
);


describe(
  "SERP Replay Pairwise Strict Parser",
  () => {
    it(
      "accepts the exact six-dimension JSON shape",
      () => {
        const parsed =
          parseSerpReplayPairwiseCandidateV1(
            validCandidate()
          );


        expect(
          parsed.dimensions
        ).toHaveLength(
          6
        );

        expect(
          Object.isFrozen(
            parsed
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects aggregate score fields",
      () => {
        expect(
          () =>
            parseSerpReplayPairwiseCandidateV1({
              ...validCandidate(),

              score:
                92,
            })
        ).toThrow(
          "SERP_REPLAY_AI_RESPONSE_TOP_LEVEL_INVALID"
        );
      }
    );


    it(
      "rejects ranking probability fields",
      () => {
        expect(
          () =>
            parseSerpReplayPairwiseCandidateV1({
              ...validCandidate(),

              rankingProbability:
                0.87,
            })
        ).toThrow(
          "SERP_REPLAY_AI_RESPONSE_TOP_LEVEL_INVALID"
        );
      }
    );


    it(
      "rejects aggregate winner fields",
      () => {
        expect(
          () =>
            parseSerpReplayPairwiseCandidateV1({
              ...validCandidate(),

              winner:
                "ARTICLE",
            })
        ).toThrow(
          "SERP_REPLAY_AI_RESPONSE_TOP_LEVEL_INVALID"
        );
      }
    );


    it(
      "rejects extra fields inside a dimension",
      () => {
        const candidate =
          validCandidate();


        candidate.dimensions[
          0
        ] = {
          ...candidate.dimensions[
            0
          ]!,

          qualityScore:
            99,
        } as any;


        expect(
          () =>
            parseSerpReplayPairwiseCandidateV1(
              candidate
            )
        ).toThrow(
          "SERP_REPLAY_AI_DIMENSION_SHAPE_INVALID"
        );
      }
    );


    it(
      "rejects duplicate dimensions",
      () => {
        const candidate =
          validCandidate();


        candidate.dimensions[
          1
        ] = {
          ...candidate.dimensions[
            1
          ]!,

          dimension:
            "INTENT_FULFILLMENT",
        };


        expect(
          () =>
            parseSerpReplayPairwiseCandidateV1(
              candidate
            )
        ).toThrow(
          "SERP_REPLAY_AI_DIMENSION_ID_INVALID"
        );
      }
    );


    it(
      "rejects malformed evidence ID arrays",
      () => {
        const candidate =
          validCandidate();


        (
          candidate.dimensions[
            0
          ] as any
        ).articleEvidenceIds = [
          123,
        ];


        expect(
          () =>
            parseSerpReplayPairwiseCandidateV1(
              candidate
            )
        ).toThrow(
          "SERP_REPLAY_AI_ARTICLE_EVIDENCE_IDS_INVALID"
        );
      }
    );
  }
);
