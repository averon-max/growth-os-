import { describe, expect, it } from "vitest";
import {
  buildStagePlanPrompt,
  resolveSelectedTemplatePolicyV1,
} from "./stage-plan-semantic-prompt-v1";
import type {
  ProductionMasterLiveSourceResearch,
} from "./production-master-live-source-adapter";
import type {
  ProductionMasterLiveStagePlanMissionInput,
} from "./production-master-live-stage-planner";

const research = {
  keyword: "what is credit monitoring",
  serpSnapshot: {
    results: [
      { rank: 1, url: "https://consumer.ftc.gov/", domain: "consumer.ftc.gov" },
    ],
  },
  serpIntelligence: {
    questions: ["How does credit monitoring work?"],
    aiOverview: { present: false },
  },
} as unknown as ProductionMasterLiveSourceResearch;

const mission = {
  websiteId: "website-test",
  topic: "Credit monitoring",
  audience: "Consumers",
  readerGoal: "Understand alert coverage and limitations",
  businessRelationship: "THIRD_PARTY",
  jurisdiction: "US",
  language: "en",
  location: "United States",
  riskClass: "FINANCIAL",
  missionIntent: "INFORMATIONAL",
  templateOverride: "EXPLAINER_GUIDE",
} as unknown as ProductionMasterLiveStagePlanMissionInput;

describe("Stage Plan semantic prompt extraction", () => {
  it("preserves explicitly selected template, observed SERP, and source-grounded policy", () => {
    const template = resolveSelectedTemplatePolicyV1({ research, mission });
    expect(template.id).toBe("EXPLAINER_GUIDE");
    const prompt = buildStagePlanPrompt({ research, mission });
    expect(prompt).toContain("templateId=EXPLAINER_GUIDE");
    expect(prompt).toContain("what is credit monitoring");
    expect(prompt).toContain("https://consumer.ftc.gov/");
    expect(prompt).toContain("How does credit monitoring work?");
    expect(prompt).toContain("CONTENT_RISK_PROFILE_V1: YMYL_FINANCE");
    expect(prompt).toContain("You must NEVER invent numbers");
    expect(prompt).toContain("respond");
  });

  it("is deterministic for an identical observed-research contract", () => {
    const first = buildStagePlanPrompt({ research, mission });
    const second = buildStagePlanPrompt({ research, mission });
    expect(first).toBe(second);
    expect(first).not.toContain("undefined");
  });
});
