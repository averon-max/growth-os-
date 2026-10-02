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


function generationWindow(): string {
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
      "generation function boundary not found"
    );
  }

  return service.slice(
    start,
    end
  );
}


describe(
  "Final review status authority",
  () => {
    it(
      "has exactly one IN_REVIEW write in article generation",
      () => {
        const window =
          generationWindow();

        const matches =
          window.match(
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
      "rejects publication policy failures",
      () => {
        const window =
          generationWindow();

        const marker =
          window.indexOf(
            "FINAL_REVIEW_AUTHORITY_PRECONDITION_V1"
          );

        expect(
          marker
        ).toBeGreaterThanOrEqual(
          0
        );

        const slice =
          window.slice(
            marker,
            marker + 1400
          );

        expect(
          slice
        ).toContain(
          '"REJECTED"'
        );

        expect(
          slice
        ).not.toContain(
          '"IN_REVIEW"'
        );
      }
    );


    it(
      "rejects required review warnings instead of entering review",
      () => {
        const window =
          generationWindow();

        const marker =
          window.indexOf(
            "FINAL_REVIEW_WARNING_FAIL_CLOSED_V1"
          );

        expect(
          marker
        ).toBeGreaterThanOrEqual(
          0
        );

        const slice =
          window.slice(
            marker,
            marker + 1500
          );

        expect(
          slice
        ).toContain(
          '"REJECTED"'
        );

        expect(
          slice
        ).not.toContain(
          '"IN_REVIEW"'
        );
      }
    );
  }
);
