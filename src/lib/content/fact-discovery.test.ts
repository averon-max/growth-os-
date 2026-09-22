import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isEvidenceGrounded,
  normalizeDiscoveryClaimKey,
  validateDiscoveredFactCandidate,
} from "./fact-discovery";


describe(
  "fact discovery evidence validation",
  () => {
    const source =
      "ScanMyCreds helps users review account security. Users can review their security results from the dashboard. No guarantee is provided.";

    it(
      "accepts evidence that exists in source text",
      () => {
        expect(
          isEvidenceGrounded(
            "Users can review their security results from the dashboard.",
            source
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects invented evidence",
      () => {
        expect(
          isEvidenceGrounded(
            "ScanMyCreds monitors billions of dark web records.",
            source
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects unsupported fact types",
      () => {
        expect(
          validateDiscoveredFactCandidate(
            {
              type:
                "RUMOR",

              claim:
                "Users can review security results.",

              evidence:
                "Users can review their security results from the dashboard.",

              confidence:
                0.9,
            },
            source
          )
        ).toBeNull();
      }
    );


    it(
      "accepts a grounded proposed fact",
      () => {
        const result =
          validateDiscoveredFactCandidate(
            {
              type:
                "CAPABILITY",

              claim:
                "Users can review security results from the dashboard.",

              evidence:
                "Users can review their security results from the dashboard.",

              confidence:
                0.92,
            },
            source
          );

        expect(
          result
        ).not.toBeNull();

        expect(
          result?.type
        ).toBe(
          "CAPABILITY"
        );
      }
    );


    it(
      "normalizes claims for deterministic deduplication",
      () => {
        expect(
          normalizeDiscoveryClaimKey(
            "ScanMyCreds — Security Results!"
          )
        ).toBe(
          "scanmycreds security results"
        );
      }
    );
  }
);
