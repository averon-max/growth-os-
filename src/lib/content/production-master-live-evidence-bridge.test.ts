import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


const plannerPath =
  path.join(
    process.cwd(),
    "src/lib/content/production-master-live-stage-planner.ts"
  );


const source =
  fs.readFileSync(
    plannerPath,
    "utf8"
  );


function evidenceBridgeSource():
  string {
  const marker =
    "export function buildEvidenceFromLiveResearch(";

  const start =
    source.indexOf(
      marker
    );

  expect(
    start
  ).toBeGreaterThanOrEqual(
    0
  );

  const nextSection =
    source.indexOf(
      "// ----------------------------------------------------------------",
      start +
        marker.length
    );

  expect(
    nextSection
  ).toBeGreaterThan(
    start
  );

  return source.slice(
    start,
    nextSection
  );
}


describe(
  "Production Master live evidence bridge boundary",
  () => {
    it(
      "registers live SERP and AI Overview URLs as source candidates",
      () => {
        const block =
          evidenceBridgeSource();

        expect(
          block
        ).toContain(
          ".serpIntelligence"
        );

        expect(
          block
        ).toContain(
          ".organic"
        );

        expect(
          block
        ).toContain(
          ".aiOverview"
        );

        expect(
          block
        ).toContain(
          ".references"
        );

        expect(
          block
        ).toContain(
          '"PRIMARY_GOVERNMENT"'
        );

        expect(
          block
        ).toContain(
          '"ACADEMIC"'
        );

        expect(
          block
        ).toContain(
          '"REPUTABLE_SECONDARY"'
        );
      }
    );


    it(
      "keeps discovery separate from claim verification",
      () => {
        const block =
          evidenceBridgeSource();

        expect(
          block
        ).toContain(
          "claimEvidence"
        );

        expect(
          block
        ).not.toContain(
          '"VERIFIED_EXCERPT"'
        );

        expect(
          block
        ).toContain(
          "DISCOVERY != VERIFICATION"
        );
      }
    );


    it(
      "deduplicates observed source URLs",
      () => {
        const block =
          evidenceBridgeSource();

        expect(
          block
        ).toContain(
          "seenUrls"
        );

        expect(
          block
        ).toContain(
          "seenUrls.has"
        );

        expect(
          block
        ).toContain(
          "seenUrls.add"
        );
      }
    );


    it(
      "uses the live evidence bridge at Stage 7",
      () => {
        expect(
          source
        ).toContain(
          "const baseEvidenceGraphInput ="
        );

        expect(
          source
        ).toContain(
          "buildEvidenceFromLiveResearch("
        );

        expect(
          source
        ).toContain(
          "await enrichLiveEvidenceGraphV1({"
        );

        expect(
          source
        ).toContain(
          "baseEvidenceGraphInput"
        );

        expect(
          source
        ).toContain(
          "claimsInput"
        );

        expect(
          source
        ).not.toContain(
          "buildEvidenceFromBusinessFacts(research)"
        );
      }
    );
  }
);
