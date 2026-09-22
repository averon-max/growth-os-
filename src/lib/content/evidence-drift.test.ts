import {
  describe,
  expect,
  it,
} from "vitest";

import {
  hashEvidenceText,
  normalizeEvidenceText,
  sourceContainsEvidence,
} from "./evidence-drift";


describe(
  "evidence drift helpers",
  () => {
    it(
      "normalizes whitespace and case",
      () => {
        expect(
          normalizeEvidenceText(
            "  Zero   Data\nRetention "
          )
        ).toBe(
          "zero data retention"
        );
      }
    );


    it(
      "matches exact evidence ignoring whitespace and case",
      () => {
        expect(
          sourceContainsEvidence({
            bodyText:
              "ScanMyCreds uses K-Anonymity for password checks.",
            evidence:
              "k-anonymity   for password checks",
          })
        ).toBe(
          true
        );
      }
    );


    it(
      "detects missing evidence",
      () => {
        expect(
          sourceContainsEvidence({
            bodyText:
              "The product offers a free scan.",
            evidence:
              "The product offers unlimited scans.",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "does not accept empty evidence",
      () => {
        expect(
          sourceContainsEvidence({
            bodyText:
              "Anything",
            evidence:
              "   ",
          })
        ).toBe(
          false
        );
      }
    );


    it(
      "produces stable hashes for equivalent evidence text",
      () => {
        expect(
          hashEvidenceText(
            "Zero Data Retention"
          )
        ).toBe(
          hashEvidenceText(
            " zero   data\nretention "
          )
        );
      }
    );
  }
);
