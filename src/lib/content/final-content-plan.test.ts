import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inferTargetFormat,
  isBenchmarkEligible,
} from "./final-content-plan-utils";


describe(
  "final content planner utilities",
  () => {
    it(
      "rejects empty social pages from benchmarks",
      () => {
        expect(
          isBenchmarkEligible({
            fetched:
              true,

            statusCode:
              200,

            wordCount:
              0,

            h2:
              [],

            h3:
              [],
          })
        ).toBe(
          false
        );
      }
    );

    it(
      "accepts substantive pages",
      () => {
        expect(
          isBenchmarkEligible({
            fetched:
              true,

            statusCode:
              200,

            wordCount:
              1600,

            h2: [
              "How it works",
              "What to do next",
              "FAQ",
            ],

            h3: [
              "Check exposure",
              "Change passwords",
              "Enable MFA",
            ],
          })
        ).toBe(
          true
        );
      }
    );

    it(
      "detects hybrid tool plus guide SERPs",
      () => {
        expect(
          inferTargetFormat([
            {
              url:
                "https://a.com/breach-checker",

              title:
                "Free Data Breach Checker",
            },
            {
              url:
                "https://b.com/hackcheck",

              title:
                "Email Leak Scanner",
            },
            {
              url:
                "https://c.com/blog/check-email",

              title:
                "How to Check If Your Email Was Compromised",
            },
          ])
        ).toBe(
          "HYBRID_TOOL_GUIDE"
        );
      }
    );

    it(
      "does not treat generic check wording as a tool",
      () => {
        expect(
          inferTargetFormat([
            {
              url:
                "https://example.com/blog/check-email",

              title:
                "How to Check If Your Email Was Compromised",
            },
          ])
        ).toBe(
          "GUIDE"
        );
      }
    );
  }
);
