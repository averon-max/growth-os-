import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


function generationWindow() {
  const start =
    service.indexOf(
      "export async function generateArticleFromBrief"
    );

  const end =
    service.indexOf(
      "export async function approveArticle",
      start
    );

  if (
    start < 0 ||
    end < 0
  ) {
    throw new Error(
      "generation boundaries unavailable"
    );
  }

  return service.slice(
    start,
    end
  );
}


describe(
  "FINAL_ARTICLE_READINESS production authority",
  () => {
    it(
      "evaluates final readiness before the sole IN_REVIEW write",
      () => {
        const window =
          generationWindow();

        const readiness =
          window.indexOf(
            "FINAL_ARTICLE_READINESS_PRODUCTION_AUTHORITY_V1"
          );

        const statusCheck =
          window.indexOf(
            'finalArticleReadiness\n        .status ===\n      "FAIL"',
            readiness
          );

        const inReview =
          window.indexOf(
            'status:\n          "IN_REVIEW"',
            readiness
          );

        expect(
          readiness
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          statusCheck
        ).toBeGreaterThan(
          readiness
        );

        expect(
          inReview
        ).toBeGreaterThan(
          statusCheck
        );
      }
    );


    it(
      "has exactly one IN_REVIEW write in generation",
      () => {
        const matches =
          generationWindow()
            .match(
              /status:\s*"IN_REVIEW"/g
            ) ??
          [];

        expect(
          matches
        ).toHaveLength(
          1
        );
      }
    );


    it(
      "rejects only FAIL so non-blocking WARN can enter human review",
      () => {
        const window =
          generationWindow();

        expect(
          window
        ).toContain(
          'finalArticleReadiness\n        .status ===\n      "FAIL"'
        );

        expect(
          window
        ).toContain(
          'status:\n            "REJECTED"'
        );
      }
    );


    it(
      "uses canonical production artifacts as readiness inputs",
      () => {
        const window =
          generationWindow();

        expect(
          window
        ).toContain(
          "persistedArticleExecutionPlan"
        );

        expect(
          window
        ).toContain(
          "acceptedMasterWriterRun"
        );

        expect(
          window
        ).toContain(
          "masterSerpReplay"
        );

        expect(
          window
        ).toContain(
          "publicationPolicy.pass"
        );

        expect(
          window
        ).toContain(
          "gate.pass"
        );
      }
    );
  }
);
