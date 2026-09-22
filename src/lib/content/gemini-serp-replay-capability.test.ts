import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  geminiGenerator,
} from "./gemini-generator";

import {
  supportsSerpReplayPairwiseGeneratorV1,
} from "./serp-replay";


describe(
  "Gemini SERP Replay pairwise capability",
  () => {
    it(
      "exposes the pairwise capability without invoking the network",
      () => {
        expect(
          supportsSerpReplayPairwiseGeneratorV1(
            geminiGenerator
          )
        ).toBe(
          true
        );


        expect(
          typeof geminiGenerator
            .compareSerpReplayPair
        ).toBe(
          "function"
        );
      }
    );


    it(
      "uses existing AI transport and strict JSON boundaries",
      () => {
        const source =
          readFileSync(
            new URL(
              "./gemini-generator.ts",
              import.meta.url
            ),
            "utf8"
          );


        const start =
          source.indexOf(
            "async compareSerpReplayPair("
          );

        const end =
          source.indexOf(
            "async repairSection(",
            start
          );


        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          end
        ).toBeGreaterThan(
          start
        );


        const method =
          source.slice(
            start,
            end
          );


        expect(
          method
        ).toContain(
          "buildSerpReplayPairwisePrompt("
        );

        expect(
          method
        ).toContain(
          "await callGemini("
        );

        expect(
          method
        ).toContain(
          "parseJson<unknown>("
        );

        expect(
          method
        ).toContain(
          "parseSerpReplayPairwiseCandidateV1("
        );


        expect(
          method
        ).not.toContain(
          "fetch("
        );
      }
    );
  }
);
