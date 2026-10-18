import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSerpConsensusV2,
} from "./serp-consensus-v2";


describe(
  "SERP Consensus V2",
  () => {
    it(
      "extracts only recurring observed content signals",
      () => {
        const consensus =
          buildSerpConsensusV2({
            results: [
              {
                rank:
                  1,

                pageType:
                  "GUIDE",

                topics: [
                  "Setup",
                  "Security",
                ],

                entities: [
                  "OAuth",
                ],

                questions: [
                  "How does setup work?",
                ],

                h2: [
                  "Setup",
                  "Security",
                ],

                wordCount:
                  2000,
              },

              {
                rank:
                  2,

                pageType:
                  "GUIDE",

                topics: [
                  "Setup",
                  "Troubleshooting",
                ],

                entities: [
                  "OAuth",
                ],

                questions: [
                  "How does setup work?",
                ],

                h2: [
                  "Setup",
                  "Troubleshooting",
                ],

                wordCount:
                  1600,
              },

              {
                rank:
                  3,

                pageType:
                  "ARTICLE",

                topics: [
                  "Setup",
                ],

                entities: [
                  "API",
                ],

                questions: [
                  "What is setup?",
                ],

                h2: [
                  "Setup",
                ],

                wordCount:
                  1800,
              },
            ],
          });

        expect(
          consensus.version
        ).toBe(
          "SERP_CONSENSUS_V2"
        );

        expect(
          consensus.topics
            .map(
              (
                item
              ) =>
                item.value
            )
        ).toContain(
          "Setup"
        );

        expect(
          consensus.topics
            .map(
              (
                item
              ) =>
                item.value
            )
        ).not.toContain(
          "Security"
        );

        expect(
          consensus.entities[0]
            ?.value
        ).toBe(
          "OAuth"
        );
      }
    );


    it(
      "records word count as observation only",
      () => {
        const consensus =
          buildSerpConsensusV2({
            results: [
              {
                rank:
                  1,

                wordCount:
                  1000,
              },

              {
                rank:
                  2,

                wordCount:
                  3000,
              },
            ],
          });

        expect(
          consensus
            .wordCountObservation
            .median
        ).toBe(
          2000
        );

        expect(
          consensus
            .wordCountObservation
            .generationTarget
        ).toBe(
          false
        );
      }
    );


    it("preserves observed article-body terms only when multiple real pages corroborate them",()=>{
      const contentDepth={
        version:"OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1",
        extraction:"MAIN_ARTICLE",
        bodyTerms:[{term:"credit monitoring",occurrences:8},
          {term:"fraud alerts",occurrences:4}],
      };
      const consensus=buildSerpConsensusV2({results:[
        {rank:1,contentDepth},
        {rank:2,contentDepth},
        {rank:3,contentDepth:{...contentDepth,extraction:"BODY_FALLBACK"}},
      ]});
      expect(consensus.bodyTermThemes?.map(x=>x.value)).toContain("credit monitoring");
      expect(consensus.bodyTermThemes?.[0]?.supportCount).toBe(2);
      expect(consensus.rules).toContain("NO_COMPETITOR_WORD_COUNT_TARGET");
      const absent=buildSerpConsensusV2({results:[{rank:1,contentDepth}]});
      expect(absent.bodyTermThemes).toEqual([]);
    });

    it(
      "does not invent consensus from a single result",
      () => {
        const consensus =
          buildSerpConsensusV2({
            results: [
              {
                rank:
                  1,

                topics: [
                  "Only one observation",
                ],
              },
            ],
          });

        expect(
          consensus.topics
        ).toHaveLength(
          0
        );

        expect(
          consensus.confidence
        ).toBe(
          "LOW"
        );
      }
    );
  }
);
