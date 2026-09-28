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
      "src/lib/content/production-master-live-stage-planner.ts"
    ),
    "utf8"
  );


describe(
  "production Stage Plan completeness recovery V4",
  () => {
    it(
      "uses requiredClaimIds consistently at the model boundary",
      () => {
        const start =
          source.indexOf(
            "interface StagePlanSectionDecision"
          );

        const end =
          source.indexOf(
            "interface StagePlanModelOutput",
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
          "requiredClaimIds: string[];"
        );

        expect(
          block
        ).not.toContain(
          "claimIds: string[];"
        );

        expect(
          source
        ).toContain(
          '"requiredClaimIds": ["claim ids from the claims array this section relies on"]'
        );
      }
    );


    it(
      "forbids synthetic query identities",
      () => {
        expect(
          source
        ).toContain(
          "never paraphrase or invent a query identity"
        );

        expect(
          source
        ).not.toContain(
          "or a close natural-language variant a reader of this topic would search"
        );
      }
    );


    it(
      "allows one bounded full regeneration",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_COMPLETENESS_RECOVERY_V4"
        );

        expect(
          source
        ).toContain(
          "STAGE_PLAN_COMPLETENESS_RETRY_V4"
        );

        expect(
          source
        ).toContain(
          "incomplete structured output; regenerating once"
        );

        expect(
          source
        ).toContain(
          "Regenerate the ENTIRE Stage Plan JSON object from scratch."
        );
      }
    );


    it(
      "remains fail closed",
      () => {
        expect(
          source
        ).toContain(
          "LIVE_STAGE_PLAN_MODEL_OUTPUT_INCOMPLETE"
        );

        expect(
          source
        ).toContain(
          "after one bounded regeneration"
        );

        expect(
          source
        ).not.toContain(
          "plan.primaryQuery ="
        );

        expect(
          source
        ).not.toContain(
          "plan.queries ="
        );

        expect(
          source
        ).not.toContain(
          "plan.topics ="
        );

        expect(
          source
        ).not.toContain(
          "plan.sections ="
        );
      }
    );
  }
);
