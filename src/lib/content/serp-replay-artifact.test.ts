import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSerpReplayArticleFingerprintV1,
} from "./serp-replay-artifact";


const article = {
  title:
    "What Is Credit Monitoring?",

  metaDescription:
    "A factual guide.",

  h1:
    "What Is Credit Monitoring?",

  bodyMarkdown:
    "## How it works\n\nAccepted body.",
};


describe(
  "SERP Replay append-only artifact",
  () => {
    it(
      "creates a deterministic SHA-256 fingerprint for one exact article version",
      () => {
        const a =
          buildSerpReplayArticleFingerprintV1(
            article
          );

        const b =
          buildSerpReplayArticleFingerprintV1({
            ...article,
          });


        expect(
          a
        ).toBe(
          b
        );

        expect(
          a
        ).toMatch(
          /^[a-f0-9]{64}$/
        );
      }
    );


    it(
      "changes fingerprint when compared article text changes",
      () => {
        const original =
          buildSerpReplayArticleFingerprintV1(
            article
          );

        const changed =
          buildSerpReplayArticleFingerprintV1({
            ...article,

            bodyMarkdown:
              `${article.bodyMarkdown}\n\nChanged text.`,
          });


        expect(
          changed
        ).not.toBe(
          original
        );
      }
    );


    it(
      "changes fingerprint when metadata or canonical H1 changes",
      () => {
        const original =
          buildSerpReplayArticleFingerprintV1(
            article
          );


        expect(
          buildSerpReplayArticleFingerprintV1({
            ...article,

            h1:
              "Different H1",
          })
        ).not.toBe(
          original
        );


        expect(
          buildSerpReplayArticleFingerprintV1({
            ...article,

            metaDescription:
              "Different meta.",
          })
        ).not.toBe(
          original
        );
      }
    );


    it(
      "uses create-only persistence with no update upsert or delete path",
      () => {
        const source =
          readFileSync(
            new URL(
              "./serp-replay-artifact.ts",
              import.meta.url
            ),
            "utf8"
          );


        expect(
          source.match(
            /prisma\.serpReplayArtifact\.create\(\{/g
          ) ??
          []
        ).toHaveLength(
          2
        );


        expect(
          source
        ).not.toContain(
          "serpReplayArtifact.update"
        );

        expect(
          source
        ).not.toContain(
          "serpReplayArtifact.upsert"
        );

        expect(
          source
        ).not.toContain(
          "serpReplayArtifact.delete"
        );

        expect(
          source
        ).not.toContain(
          "serpReplayArtifact.deleteMany"
        );
      }
    );


    it(
      "persists execution failures without fabricating a replay status",
      () => {
        const source =
          readFileSync(
            new URL(
              "./serp-replay-artifact.ts",
              import.meta.url
            ),
            "utf8"
          );


        const start =
          source.indexOf(
            "export async function createSerpReplayFailureArtifactV1("
          );


        expect(
          start
        ).toBeGreaterThanOrEqual(
          0
        );


        const failure =
          source.slice(
            start
          );


        expect(
          failure
        ).toContain(
          'executionStatus:\n        "FAILED"'
        );

        expect(
          failure
        ).toContain(
          "replayStatus:\n        null"
        );

        expect(
          failure
        ).not.toContain(
          'replayStatus:\n        "READY"'
        );
      }
    );
  }
);
