import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/gemini-generator.ts"
    ),
    "utf8"
  );


describe(
  "OpenAI Luna production boundary",
  () => {
    it(
      "uses Responses API",
      () => {
        expect(
          source
        ).toContain(
          "client.responses.create"
        );

        expect(
          source
        ).toMatch(
          /store:\s*false/
        );
      }
    );


    it(
      "uses Luna as default",
      () => {
        expect(
          source
        ).toContain(
          '"gpt-5.6-luna"'
        );
      }
    );


    it(
      "does not route production AI through Groq",
      () => {
        const start =
          source.indexOf(
            "export async function callContentAiJson("
          );

        const end =
          source.indexOf(
            "async function callGeminiApi(",
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
          "callOpenAiApi("
        );

        expect(
          block
        ).not.toContain(
          "callGeminiApi("
        );

        expect(
          block
        ).not.toContain(
          "callGroq("
        );
      }
    );


    it(
      "uses none reasoning in semantic verifier",
      () => {
        const start =
          source.indexOf(
            "async verifySectionClaims("
          );

        const end =
          source.indexOf(
            "async critiqueArticle(",
            start
          );

        expect(
          source.slice(
            start,
            end
          )
        ).toContain(
          '"none"'
        );
      }
    );
  }
);
