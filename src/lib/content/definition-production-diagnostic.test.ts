import { it } from "vitest";
import {
  isSafeMissionPreservingClaimReplanCandidateV1,
  selectDeterministicDefinitionReplanCandidateV1,
} from "./claim-replan-safety-v1";

it("diagnoses production definition recovery", () => {
  const base = {
    originalText:
      "Credit monitoring is a service that tracks specified changes associated with a person's credit file.",
    primaryQuery: "what is credit monitoring",
    sectionHeading: "What Is Credit Monitoring?",
    sectionMission:
      "Give a precise definition and establish the scope of the service",
    sectionQuestions: ["what is credit monitoring"],
    sectionExpectedOutcome:
      "The reader can explain credit monitoring in plain language.",
  };

  const candidates = [
    "Credit monitoring is a service that automatically alerts you when there is activity in your credit report.",
    "Credit monitoring is a service that watches for changes in your credit reports.",
    "Credit monitoring is a service that tracks changes in credit information.",
    "Credit monitoring can send alerts about changes to credit reports.",
  ];

  for (const candidateText of candidates) {
    console.log("CANDIDATE:", JSON.stringify({
      candidateText,
      safetyAccepted:
        isSafeMissionPreservingClaimReplanCandidateV1({
          ...base,
          candidateText,
        }),
    }));
  }

  console.log("SELECTION:", JSON.stringify(
    selectDeterministicDefinitionReplanCandidateV1({
      ...base,
      candidates: candidates.map((excerpt, i) => ({
        sourceId: `fixture-${i}`,
        excerpt,
      })),
    })
  ));
});
