import {
  describe,
  expect,
  it,
} from "vitest";

import {
  findVerifiedExcerptCandidateV1,
  negativeClaimTargetAnchorsV1,
} from "./live-evidence-verification";


describe(
  "Verified excerpt negative claim target preservation V1",
  () => {
    it(
      "extracts the material target from the exact production claim",
      () => {
        expect(
          negativeClaimTargetAnchorsV1(
            "Checking a credit monitoring service does not itself change a credit score."
          )
        ).toEqual(
          [
            "change",
            "score",
          ]
        );
      }
    );


    it(
      "rejects the exact production false-positive shape",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Checking a credit monitoring service does not itself change a credit score.",

            bodyText: [
              "The Basic plan is free, while Premium currently costs $4.99 for the first month, then $24.99 per month.",
              "Both plans provide different services.",
              "The Premium plan offers a more extensive monitoring service that checks credit reports from each of three credit bureaus.",
              "The Basic plan only looks at Experian.",
              "The alerts with the Basic plan include new credit inquiries and new accounts, not balance changes, credit utilization, dormant accounts and other features.",
              "Credit monitoring can be part of a comprehensive way to protect yourself from fraud.",
            ].join(
              " "
            ),
          });


        expect(
          candidate
        ).toBeNull();
      }
    );


    it(
      "accepts direct support for the production claim",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Checking a credit monitoring service does not itself change a credit score.",

            bodyText:
              "Checking your own credit through a monitoring service does not itself change your credit score. Reviewing your own credit information is different from applying for new credit.",
          });


        expect(
          candidate
        ).not.toBeNull();
      }
    );


    it(
      "works generically for another negative factual claim",
      () => {
        expect(
          negativeClaimTargetAnchorsV1(
            "Credit monitoring does not prevent identity theft."
          )
        ).toEqual(
          [
            "identity",
            "theft",
          ]
        );


        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring does not prevent identity theft.",

            bodyText:
              "Credit monitoring can identify suspicious changes, but it does not prevent identity theft from occurring.",
          });


        expect(
          candidate
        ).not.toBeNull();
      }
    );


    it(
      "rejects same-topic negative prose when the target disappears",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring does not prevent identity theft.",

            bodyText:
              "Credit monitoring does not include every type of account activity and may only provide alerts for selected changes.",
          });


        expect(
          candidate
        ).toBeNull();
      }
    );


    it(
      "does not change positive claim matching",
      () => {
        const candidate =
          findVerifiedExcerptCandidateV1({
            claimText:
              "Credit monitoring services can alert users when monitored credit report information changes.",

            bodyText:
              "Credit monitoring services can alert users when information in a monitored credit report changes.",
          });


        expect(
          candidate
        ).not.toBeNull();
      }
    );
  }
);
