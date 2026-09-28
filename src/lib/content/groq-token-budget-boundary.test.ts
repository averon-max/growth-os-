import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


const source =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/gemini-generator.ts"
    ),
    "utf8"
  );


describe(
  "Groq article generation token budget",
  () => {
    it(
      "does not request 16000 completion tokens",
      () => {
        expect(
          source
        ).not.toMatch(
          /max_completion_tokens\s*:\s*16000/
        );
      }
    );


    it(
      "uses dynamic prompt-aware budgeting",
      () => {
        expect(
          source
        ).toContain(
          "resolveGroqMaxCompletionTokens(prompt)"
        );

        expect(
          source
        ).toContain(
          "estimateGroqPromptTokens"
        );
      }
    );


    it(
      "stays below the 8000 TPM ceiling",
      () => {
        expect(
          source
        ).toContain(
          "GROQ_SAFE_REQUEST_TOKEN_BUDGET"
        );

        expect(
          source
        ).toMatch(
          /GROQ_SAFE_REQUEST_TOKEN_BUDGET\s*=\s*7800/
        );
      }
    );


    it(
      "does not truncate grounded context",
      () => {
        expect(
          source
        ).toContain(
          "Refusing to truncate grounded context."
        );

        expect(
          source
        ).not.toContain(
          "prompt.slice("
        );
      }
    );
  }
);
