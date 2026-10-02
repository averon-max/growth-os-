import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const critic =
  readFileSync(
    new URL(
      "./master-article-semantic-critics.ts",
      import.meta.url
    ),
    "utf8"
  );

const prompt =
  readFileSync(
    new URL(
      "./master-article-semantic-critic-prompt.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "semantic critic source reference boundary",
  () => {
    it(
      "allows only canonical IDs plus exact authoritative source URLs",
      () => {
        expect(
          critic
        ).toContain(
          "SEMANTIC_CRITIC_SOURCE_REFERENCE_ALIAS_V1"
        );

        expect(
          critic
        ).toContain(
          "sourceIds.add(\n        source.id"
        );

        expect(
          critic
        ).toContain(
          "sourceIds.add(\n        source.url"
        );
      }
    );


    it(
      "tells the semantic model not to emit URLs as sourceIds",
      () => {
        expect(
          prompt
        ).toContain(
          "SEMANTIC_CRITIC_CANONICAL_SOURCE_ID_PROMPT_V1"
        );

        expect(
          prompt
        ).toContain(
          "Never place an http:// or https:// URL inside sourceIds"
        );
      }
    );


    it(
      "keeps unknown-source fail-closed validation",
      () => {
        expect(
          critic
        ).toContain(
          "MASTER_SEMANTIC_CRITIC_UNKNOWN_SOURCE"
        );
      }
    );
  }
);
