import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Generator provider failover boundary",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          "src/lib/content/gemini-generator.ts"
        ),
        "utf8"
      );


    it(
      "routes generator calls through canonical failover",
      () => {
        const start =
          source.indexOf(
            "async function callGemini("
          );

        const end =
          source.indexOf(
            "function hasContentAiKey(",
            start
          );

        const block =
          source.slice(
            start,
            end
          );

        expect(
          block
        ).toContain(
          "callContentAiJson("
        );

        expect(
          block
        ).not.toContain(
          'provider ==='
        );

        expect(
          block
        ).not.toContain(
          "return callGroq("
        );
      }
    );


    it(
      "allows request-too-large failures to fail over",
      () => {
        const start =
          source.indexOf(
            "function isContentAiFailoverEligible"
          );

        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );

        const block =
          source.slice(
            start,
            start + 1600
          );

        expect(
          block
        ).toContain(
          "413"
        );

        expect(
          block
        ).toContain(
          "429"
        );
      }
    );


    it(
      "retains both provider transports",
      () => {
        expect(
          source
        ).toContain(
          "async function callGroq("
        );

        expect(
          source
        ).toContain(
          "async function callGeminiApi("
        );

        expect(
          source
        ).toContain(
          "export async function callContentAiJson("
        );
      }
    );
  }
);
