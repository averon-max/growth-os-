import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Production Competitive SEO V2 boundary",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          "src/lib/content/production-master-artifact-builders.ts"
        ),
        "utf8"
      );


    it(
      "builds consensus from the real supplied SERP artifact",
      () => {
        expect(
          source
        ).toContain(
          "buildSerpConsensusV2("
        );

        expect(
          source
        ).toContain(
          "input.serpResearch"
        );
      }
    );


    it(
      "compares consensus against expected mission coverage",
      () => {
        expect(
          source
        ).toContain(
          "buildCompetitiveGapV2({"
        );

        expect(
          source
        ).toContain(
          "expectedCoverage"
        );
      }
    );


    it(
      "feeds competitive intelligence into canonical Master Blueprint",
      () => {
        expect(
          source
        ).toContain(
          "applyCompetitiveSeoToMasterBlueprintV2({"
        );

        expect(
          source
        ).toContain(
          "competitiveMasterBlueprintInput"
        );
      }
    );


    it(
      "does not replace Universal SEO decision wiring",
      () => {
        expect(
          source
        ).toContain(
          "applyUniversalSeoDecisionToMasterBlueprintV2({"
        );

        expect(
          source
        ).toContain(
          "universalSeoDecision"
        );
      }
    );
  }
);
