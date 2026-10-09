import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const generatorSource =
  readFileSync(
    new URL(
      "./gemini-generator.ts",
      import.meta.url
    ),
    "utf8"
  );


const plannerSource =
  readFileSync(
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Structured recovery GPT-only boundary",
  () => {
    it(
      "keeps recovery calls but never switches vendor",
      () => {
        expect(
          plannerSource
        ).toContain(
          "forceAlternateProvider:"
        );


        const start =
          generatorSource.indexOf(
            "export async function callContentAiJson("
          );

        const end =
          generatorSource.indexOf(
            "async function callGeminiApi(",
            start
          );


        expect(start)
          .toBeGreaterThanOrEqual(
            0
          );

        expect(end)
          .toBeGreaterThan(
            start
          );


        const dispatcher =
          generatorSource.slice(
            start,
            end
          );


        expect(
          dispatcher
        ).toContain(
          "GPT_ONLY_CONTENT_RUNTIME_V1"
        );

        expect(
          dispatcher
        ).toContain(
          "return callOpenAiApi("
        );

        expect(
          dispatcher
        ).toContain(
          "GPT-only structured recovery using OpenAI"
        );

        expect(
          dispatcher
        ).not.toContain(
          "callGeminiApi("
        );

        expect(
          dispatcher
        ).not.toContain(
          "callGroq("
        );
      }
    );


    it(
      "keeps strict evidence verification authoritative",
      () => {
        expect(
          plannerSource
        ).toContain(
          "enrichLiveEvidenceGraphV1"
        );

        expect(
          plannerSource
        ).toContain(
          "VERIFIED_EXCERPT"
        );

        expect(
          plannerSource
        ).toContain(
          "SUPPORTS"
        );
      }
    );
  }
);
