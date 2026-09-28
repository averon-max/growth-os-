import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    new URL(
      "./production-master-live-source-adapter.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Production Master Live Source Adapter boundary",
  () => {
    it(
      "binds the existing production source providers",
      () => {
        expect(
          source
        ).toContain(
          'from "./keyword-context"'
        );


        expect(
          source
        ).toContain(
          'from "./business-fact-repository"'
        );


        expect(
          source
        ).toContain(
          'from "./serp-intelligence"'
        );


        expect(
          source
        ).toContain(
          'from "@/lib/keywords/dataforseo-provider"'
        );


        expect(
          source
        ).toContain(
          "buildSerpIntelligence"
        );


        expect(
          source
        ).toContain(
          "createSerpSnapshot"
        );
      }
    );


    it(
      "does not implement another network client",
      () => {
        expect(
          source
        ).not.toMatch(
          /\bfetch\s*\(/
        );


        expect(
          source
        ).not.toContain(
          "api.dataforseo.com"
        );
      }
    );


    it(
      "does not directly persist anything",
      () => {
        expect(
          source
        ).not.toMatch(
          /\bprisma\./
        );


        expect(
          source
        ).not.toContain(
          "contentBrief.create"
        );


        expect(
          source
        ).not.toContain(
          "contentArticle.create"
        );
      }
    );


    it(
      "does not contain synthetic numeric SEO defaults",
      () => {
        expect(
          source
        ).not.toMatch(
          /searchVolume\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /keywordDifficulty\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /impressions\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /clicks\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /position\s*:\s*0/
        );


        expect(
          source
        ).not.toMatch(
          /cpc\s*:\s*0/
        );
      }
    );


    it(
      "does not reconstruct Stage 1-8 from historical planning snapshots",
      () => {
        expect(
          source
        ).not.toMatch(
          /\bfinalPlan\b/
        );


        expect(
          source
        ).not.toMatch(
          /\bsearchBlueprintShadow\b/
        );
      }
    );
  }
);
