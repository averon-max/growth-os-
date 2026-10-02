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

import {
  findVerifiedExcerptCandidateV1,
} from "./live-evidence-verification";


describe(
  "SELF_HEALING_EVIDENCE_RECOVERY_V1",
  () => {
    it(
      "matches a factual definition expressed with normal paraphrasing",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring is a service that watches for changes in a consumer's credit information.",

            bodyText:
              "Credit monitoring tracks changes to your credit reports and can alert you when new activity appears.",
          });

        expect(
          candidate
        ).not.toBeNull();
      }
    );


    it(
      "matches bureau scope expressed as coverage rather than dependency wording",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "The credit information monitored depends on the credit bureau or bureaus included by the service.",

            bodyText:
              "Some credit monitoring services cover one credit bureau, while other services cover multiple credit bureaus.",
          });

        expect(
          candidate
        ).not.toBeNull();
      }
    );


    it(
      "still rejects opposite polarity",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring does not repair inaccuracies on a credit report.",

            bodyText:
              "Credit monitoring repairs inaccuracies on a credit report.",
          });

        expect(
          candidate
        ).toBeNull();
      }
    );


    it(
      "wires repeated evidence recovery instead of one-shot recovery",
      () => {
        const planner =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/production-master-live-stage-planner.ts"
            ),
            "utf8"
          );

        const evidence =
          readFileSync(
            join(
              process.cwd(),
              "src/lib/content/live-evidence-verification.ts"
            ),
            "utf8"
          );

        expect(
          planner
        ).toContain(
          "SELF_HEALING_CLAIM_EVIDENCE_RECOVERY_V1"
        );

        expect(
          planner
        ).toContain(
          "MAX_EVIDENCE_RECOVERY_WAVES_V1"
        );

        expect(
          planner
        ).toContain(
          "[content evidence recovery wave]"
        );

        expect(
          planner
        ).not.toContain(
          "There is exactly ONE recovery pass."
        );

        expect(
          evidence
        ).toContain(
          "EVIDENCE_VERIFICATION_CONTEXT_TOKENS_V1"
        );

        expect(
          evidence
        ).toMatch(
          /results\.slice\(\s*0,\s*10\s*\)/
        );
      }
    );
  }
);
