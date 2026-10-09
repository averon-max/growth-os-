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


const coverage =
  readFileSync(
    new URL(
      "./expected-coverage.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "production ExpectedCoverage demand bridge V1",
  () => {
    it(
      "preserves Stage Plan observed query identities into ExpectedCoverage",
      () => {
        expect(
          planner
        ).toContain(
          "OBSERVED_QUERY_DEMAND_BRIDGE_V1"
        );


        expect(
          planner
        ).toContain(
          "queryIdentities:"
        );


        expect(
          planner
        ).toContain(
          "t.queries"
        );
      }
    );


    it(
      "resolves identities only inside canonical ExpectedCoverage QueryGraph context",
      () => {
        expect(
          coverage
        ).toContain(
          "OBSERVED_QUERY_IDENTITY_RESOLUTION_V1"
        );


        expect(
          coverage
        ).toContain(
          "input.queryIdentities"
        );


        expect(
          coverage
        ).toContain(
          "queryGraph.nodes.find"
        );


        expect(
          coverage
        ).toContain(
          "EXPECTED_COVERAGE_QUERY_IDENTITY_UNKNOWN"
        );
      }
    );


    it(
      "does not manufacture query-node IDs in the live planner",
      () => {
        const bridgeStart =
          planner.indexOf(
            "OBSERVED_QUERY_DEMAND_BRIDGE_V1"
          );

        expect(
          bridgeStart
        ).toBeGreaterThanOrEqual(
          0
        );


        const bridgeWindow =
          planner.slice(
            bridgeStart,
            bridgeStart + 1800
          );


        expect(
          bridgeWindow
        ).not.toContain(
          "query_"
        );


        expect(
          bridgeWindow
        ).not.toContain(
          "stableHash"
        );
      }
    );
  }
);
