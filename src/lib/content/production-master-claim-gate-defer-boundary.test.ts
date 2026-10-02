import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const readiness =
  readFileSync(
    new URL(
      "./production-master-runtime-readiness.ts",
      import.meta.url
    ),
    "utf8"
  );


const adapter =
  readFileSync(
    new URL(
      "./master-runtime-adapter.ts",
      import.meta.url
    ),
    "utf8"
  );


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "claim gate deferred publication-scope boundary",
  () => {
    it(
      "allows only claim-gate-only blocked runtimes through production readiness",
      () => {
        expect(
          readiness
        ).toContain(
          "CLAIM_GATE_DEFERRED_TO_PUBLICATION_SCOPE_V1"
        );

        expect(
          readiness
        ).toContain(
          "claimGateOnlyBlockedRuntime"
        );

        expect(
          readiness
        ).toMatch(
          /masterInspection\.blockers\.every[\s\S]*blocker\s*===\s*"MASTER_RUNTIME_CLAIM_GATE_BLOCKED"/u
        );
      }
    );


    it(
      "still treats missing runtime as structurally invalid",
      () => {
        expect(
          readiness
        ).toMatch(
          /!masterInspection\.runtime/u
        );

        expect(
          readiness
        ).toContain(
          '"MASTER_RUNTIME_INVALID"'
        );
      }
    );


    it(
      "does not globally soften NO_GO or original-value blockers",
      () => {
        expect(
          readiness
        ).not.toContain(
          'blocker ===\n        "MASTER_RUNTIME_NO_GO"'
        );

        expect(
          readiness
        ).not.toContain(
          'blocker ===\n        "MASTER_RUNTIME_ORIGINAL_VALUE_BLOCKED"'
        );
      }
    );


    it(
      "preserves adapter semantics where claim blockers retain runtime",
      () => {
        expect(
          adapter
        ).toContain(
          "They block the WRITER, not persistence."
        );

        expect(
          adapter
        ).toContain(
          "runtime:\n        frozenRuntime"
        );
      }
    );


    it(
      "generation still requires an actual Master Runtime object",
      () => {
        expect(
          service
        ).toMatch(
          /!masterRuntimeInspection[\s\S]*\.runtime/u
        );
      }
    );
  }
);
