import {
  describe,
  expect,
  it,
} from "vitest";

import {
  areNearDuplicateDiscoveryClaims,
  isAtomicDiscoveryClaim,
} from "@/lib/content/fact-discovery";


describe(
  "fact discovery near duplicate detection",
  () => {
    it(
      "detects a broader version of the same capability",
      () => {
        expect(
          areNearDuplicateDiscoveryClaims(
            "ScanMyCreds removes personal data from people search sites, data broker databases, and background check services.",
            "ScanMyCreds removes personal data from people search sites, data broker databases, and background check services and monitors email for new breaches."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not merge unrelated facts",
      () => {
        expect(
          areNearDuplicateDiscoveryClaims(
            "ScanMyCreds never sells user data.",
            "The Pro plan provides unlimited scans and an AI breach analyst."
          )
        ).toBe(
          false
        );
      }
    );
  }
);



describe(
  "atomic fact discovery claims",
  () => {
    it(
      "accepts one independently verifiable capability",
      () => {
        expect(
          isAtomicDiscoveryClaim(
            "ScanMyCreds offers a free scan."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "accepts a specific grounded security capability",
      () => {
        expect(
          isAtomicDiscoveryClaim(
            "ScanMyCreds uses k-anonymity for password checks so that plaintext passwords do not leave the device."
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "rejects price plus billing and cancellation in one claim",
      () => {
        expect(
          isAtomicDiscoveryClaim(
            "The Pro plan costs $4.99 per month, is billed monthly, and can be cancelled anytime."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects multiple independent included features",
      () => {
        expect(
          isAtomicDiscoveryClaim(
            "The Pro plan provides unlimited scans, an AI breach analyst, a daily security briefing, and an email alias generator."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects two independent product actions",
      () => {
        expect(
          isAtomicDiscoveryClaim(
            "ScanMyCreds removes personal data and monitors email for new breaches."
          )
        ).toBe(
          false
        );
      }
    );


    it(
      "rejects metric plus account policy",
      () => {
        expect(
          isAtomicDiscoveryClaim(
            "The free scan takes 10 seconds and requires no account."
          )
        ).toBe(
          false
        );
      }
    );
  }
);
