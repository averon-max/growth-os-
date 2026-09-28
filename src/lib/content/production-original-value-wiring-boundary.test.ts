import fs from "node:fs";
import path from "node:path";

import {
  describe,
  expect,
  it,
} from "vitest";


const planner =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "src/lib/content/production-master-live-stage-planner.ts"
    ),
    "utf8"
  );


describe(
  "Production Original Value wiring boundary",
  () => {
    it(
      "does not hard-code an empty original-value stage",
      () => {
        expect(
          planner
        ).not.toContain(
          "originalValue: {\n      assets: [],\n      commoditySignals: {},\n    }"
        );
      }
    );


    it(
      "uses the deterministic live original-value planner",
      () => {
        expect(
          planner
        ).toContain(
          "planProductionOriginalValue"
        );

        expect(
          planner
        ).toContain(
          "PRODUCTION_ORIGINAL_VALUE_STAGE6C_V1"
        );
      }
    );


    it(
      "binds the planned original-value asset to a section blueprint",
      () => {
        expect(
          planner
        ).toContain(
          "originalValuePlan"
        );

        expect(
          planner
        ).toContain(
          "assetSectionIndex"
        );

        expect(
          planner
        ).toContain(
          "asset:"
        );
      }
    );
  }
);
