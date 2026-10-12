import { describe, expect, it } from "vitest";
import {
  assertPreWriterMissionAuthorityV1,
  inspectPreWriterMissionAuthorityV1,
} from "./article-prewriter-mission-authority-gate-v1";

describe("prewriter mission authority gate", () => {
  const question = {
    heading: "Does Credit Monitoring Affect Your Credit Score?",
    requiredClaims: ["claim-score-inquiry"],
  };

  it("rejects a question that lost an unsupported required claim at evidence contraction", () => {
    const input = {
      blueprints: [question],
      sections: [{
        heading: question.heading,
        state: "WRITABLE",
        requiredClaimIds: [],
      }],
    };
    expect(inspectPreWriterMissionAuthorityV1(input).issues[0]?.missingClaimIds)
      .toEqual(["claim-score-inquiry"]);
    expect(() => assertPreWriterMissionAuthorityV1(input)).toThrow(
      /ARTICLE_PREWRITER_MISSION_AUTHORITY_LOST:SECTION=0/
    );
  });

  it("allows a question whose approved claim survives the execution plan", () => {
    const input = {
      blueprints: [question],
      sections: [{
        heading: question.heading,
        state: "WRITABLE",
        requiredClaimIds: ["claim-score-inquiry"],
      }],
    };
    expect(() => assertPreWriterMissionAuthorityV1(input)).not.toThrow();
  });

  it("does not change existing defer decisions or impose factual claims on questions without them", () => {
    const input = {
      blueprints: [question, {
        heading: "What Can Alerts Tell You?",
        requiredClaims: [],
      }],
      sections: [
        {
          heading: question.heading,
          state: "DEFERRED_NO_EVIDENCE",
          requiredClaimIds: [],
        },
        {
          heading: "What Can Alerts Tell You?",
          state: "WRITABLE",
          requiredClaimIds: [],
        },
      ],
    };
    expect(inspectPreWriterMissionAuthorityV1(input).ready).toBe(true);
  });

  it("protects a MUST question owned by a non-question H2 after claim contraction", () => {
    const heading = "How Credit Scores Work";
    expect(() => assertPreWriterMissionAuthorityV1({
      blueprints: [{ heading, requiredClaims: ["claim-score-inquiry"] }],
      sections: [{
        heading,
        state: "WRITABLE",
        requiredQuestionIds: ["question-score"],
        requiredClaimIds: [],
      }],
    })).toThrow("ARTICLE_PREWRITER_MISSION_AUTHORITY_LOST");
  });

  it("preserves identity checks between the locked plan and original runtime", () => {
    expect(() => assertPreWriterMissionAuthorityV1({
      blueprints: [question],
      sections: [{
        heading: "Other question?",
        state: "WRITABLE",
        requiredClaimIds: [],
      }],
    })).toThrow("ARTICLE_PREWRITER_MISSION_HEADING_MISMATCH");
  });
});
