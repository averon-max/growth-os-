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
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


const evidence =
  readFileSync(
    new URL(
      "./live-evidence-verification.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "Production Master atomic claim boundary",
  () => {
    it(
      "requires one independently verifiable proposition per claim",
      () => {
        expect(
          planner
        ).toContain(
          "ATOMIC_CLAIM_CONTRACT_V1"
        );

        expect(
          planner
        ).toContain(
          "exactly one independently verifiable factual proposition"
        );

        expect(
          planner
        ).toContain(
          "A source excerpt must be able to support the WHOLE claim"
        );

        expect(
          planner
        ).toContain(
          "split it further"
        );
      }
    );


    it(
      "does not restrict verification to only eight sources",
      () => {
        expect(
          evidence
        ).toContain(
          "MAX_EVIDENCE_FETCH_SOURCES"
        );

        expect(
          evidence
        ).toContain(
          "16"
        );

        expect(
          evidence
        ).not.toContain(
          "graph.sources.slice(\n      0,\n      8"
        );
      }
    );


    it(
      "keeps the publication-grade evidence boundary",
      () => {
        expect(
          evidence
        ).toContain(
          '"VERIFIED_EXCERPT"'
        );

        expect(
          evidence
        ).toContain(
          '"SUPPORTS"'
        );
      }
    );
  }
);
