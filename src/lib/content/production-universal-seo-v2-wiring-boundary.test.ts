import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Production Universal SEO V2 wiring",
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
      "builds the universal SEO decision inside production artifact assembly",
      () => {
        expect(
          source
        ).toContain(
          "buildUniversalSeoDecisionV2({"
        );

        expect(
          source
        ).toContain(
          "input.serpResearch"
        );

        expect(
          source
        ).toContain(
          "input.urlOwnership"
        );
      }
    );


    it(
      "uses SMART cannibalization by default",
      () => {
        expect(
          source
        ).toContain(
          'input.cannibalizationMode ??'
        );

        expect(
          source
        ).toContain(
          '"SMART"'
        );
      }
    );


    it(
      "rewrites the master blueprint from the universal decision",
      () => {
        expect(
          source
        ).toContain(
          "applyUniversalSeoDecisionToMasterBlueprintV2({"
        );

        expect(
          source
        ).toContain(
          "universalMasterBlueprintInput"
        );
      }
    );


    it(
      "rewrites section jobs from the universal decision",
      () => {
        expect(
          source
        ).toContain(
          "applyUniversalSeoDecisionToSectionsV2({"
        );

        expect(
          source
        ).toContain(
          "universalSectionBlueprintInput"
        );
      }
    );


    it(
      "pushes universal rules into persisted writer style rules",
      () => {
        expect(
          source
        ).toContain(
          "buildUniversalSeoWriterRulesV2("
        );
      }
    );


    it(
      "preserves real URL ownership instead of manufacturing it",
      () => {
        expect(
          source
        ).toContain(
          "urlOwnership:"
        );

        expect(
          source
        ).toContain(
          "input.urlOwnership ??"
        );
      }
    );
  }
);
