import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const planner =
  readFileSync(
    "src/lib/content/production-master-live-stage-planner.ts",
    "utf8"
  );


const plan =
  readFileSync(
    "src/lib/content/article-execution-plan-v1.ts",
    "utf8"
  );


const binder =
  readFileSync(
    "src/lib/content/article-execution-plan-binding-v1.ts",
    "utf8"
  );


const generator =
  readFileSync(
    "src/lib/content/master-article-generator.ts",
    "utf8"
  );


const prompt =
  readFileSync(
    "src/lib/content/master-section-prompt.ts",
    "utf8"
  );


describe(
  "Production Media Requirements V1 wiring",
  () => {
    it(
      "derives media only from existing Original Value assignment",
      () => {
        expect(
          planner
        ).toContain(
          "PRODUCTION_MEDIA_REQUIREMENTS_V1"
        );

        expect(
          planner
        ).toContain(
          "assignedOriginalValueAsset"
        );

        expect(
          planner
        ).toContain(
          "buildMediaRequirementsForAssignedAssetV1"
        );
      }
    );


    it(
      "locks media requirements into ArticleExecutionPlan",
      () => {
        expect(
          plan
        ).toContain(
          "mediaRequirements?:"
        );

        expect(
          planner
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_MEDIA_LOCK_V1"
        );

        expect(
          planner
        ).toContain(
          "mediaRequirements:"
        );
      }
    );


    it(
      "binds media into existing Writer execution authority",
      () => {
        expect(
          binder
        ).toContain(
          "ARTICLE_EXECUTION_PLAN_WRITER_MEDIA_ASSET_DRIFT"
        );

        expect(
          binder
        ).toContain(
          "mediaRequirements:"
        );
      }
    );


    it(
      "blocks unverified proof media at Writer boundary",
      () => {
        expect(
          generator
        ).toContain(
          "SECTION_GENERATION_UNVERIFIED_MEDIA_ASSET_USED"
        );

        expect(
          prompt
        ).toContain(
          "REQUIRES_VERIFICATION"
        );

        expect(
          prompt
        ).toContain(
          "Never invent screenshot contents"
        );
      }
    );


    it(
      "does not introduce a second asset planner",
      () => {
        expect(
          planner.match(
            /planProductionOriginalValue\(\{/g
          )?.length
        ).toBe(
          1
        );
      }
    );
  }
);
