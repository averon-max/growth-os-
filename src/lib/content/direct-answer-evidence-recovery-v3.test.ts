import { describe, expect, it } from "vitest";
import {
  eligibleForDirectAnswerEvidenceRecoveryV3,
  directAnswerEvidenceSearchProbeV3,
} from "./direct-answer-evidence-recovery-v3";

describe("direct-answer evidence recovery v3", () => {
  const requiredRoles = new Set(["definition"]);
  it("recovers a question H2 even when template role and explicit questions are absent", () => {
    expect(eligibleForDirectAnswerEvidenceRecoveryV3({
      heading: "Does Credit Monitoring Affect Your Credit Score?",
      questions: [],
      roles: ["optional"],
      requiredRoles,
    })).toBe(true);
  });
  it("preserves previous required role behavior", () => {
    expect(eligibleForDirectAnswerEvidenceRecoveryV3({
      heading: "Credit score facts",
      questions: ["Does monitoring affect your score?"],
      roles: ["definition"],
      requiredRoles,
    })).toBe(true);
  });
  it("does not expand unasked non-required editorial sections", () => {
    expect(eligibleForDirectAnswerEvidenceRecoveryV3({
      heading: "Additional background",
      questions: [],
      roles: ["optional"],
      requiredRoles,
    })).toBe(false);
  });
  it("prefers the exact question to generic mission text", () => {
    expect(directAnswerEvidenceSearchProbeV3({
      heading: "Does Credit Monitoring Affect Your Credit Score?",
      questions: [],
    })).toBe("Does Credit Monitoring Affect Your Credit Score?");
    expect(directAnswerEvidenceSearchProbeV3({
      heading: "Credit score facts",
      questions: ["Does monitoring affect your score?"],
    })).toBe("Does monitoring affect your score?");
  });
});

describe("direct-answer probe ownership", () => {
  it("searches the actual question H2 instead of an adjacent definition subquestion", () => {
    expect(directAnswerEvidenceSearchProbeV3({
      heading: "Does Credit Monitoring Affect Your Credit Score?",
      questions: ["What is a soft inquiry?", "Does checking your report lower your score?"],
    })).toBe("Does Credit Monitoring Affect Your Credit Score?");
  });

  it("retains explicit questions when the H2 is not question-shaped", () => {
    expect(directAnswerEvidenceSearchProbeV3({
      heading: "Credit monitoring and scores",
      questions: ["Does credit monitoring affect your credit score?"],
    })).toBe("Does credit monitoring affect your credit score?");
  });
});
