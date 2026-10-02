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


describe(
  "successful content lifecycle boundary",
  () => {
    it(
      "moves successful completed generation into IN_REVIEW",
      () => {
        expect(
          service
        ).toContain(
          "SUCCESSFUL_CONTENT_GENERATION_ENTERS_REVIEW_V1"
        );

        const markerIndex =
          service.indexOf(
            "SUCCESSFUL_CONTENT_GENERATION_ENTERS_REVIEW_V1"
          );

        const successWindow =
          service.slice(
            markerIndex,
            markerIndex + 1800
          );


        expect(
          successWindow
        ).toContain(
          'status:\n          "IN_REVIEW"'
        );

        expect(
          successWindow
        ).toContain(
          'publishError:\n          null'
        );

        expect(
          successWindow
        ).not.toContain(
          'status:\n          "DRAFT"'
        );
      }
    );


    it(
      "keeps rejection fail-closed",
      () => {
        expect(
          service
        ).toContain(
          'status:\n            "REJECTED"'
        );
      }
    );


    it(
      "keeps approval as a separate lifecycle step",
      () => {
        expect(
          service
        ).toContain(
          "export async function approveArticle"
        );

        expect(
          service
        ).toContain(
          '"APPROVED"'
        );
      }
    );
  }
);
