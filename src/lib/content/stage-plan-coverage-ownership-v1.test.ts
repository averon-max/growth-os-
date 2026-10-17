import { describe, expect, it } from "vitest";
import { inspectStagePlanCoverageOwnership } from "./stage-plan-coverage-ownership-v1";
import type { StagePlanModelOutput } from "./production-master-live-stage-planner";

function plan({
  topics,
  questions,
  sections,
}: {
  topics: string[];
  questions: string[];
  sections: Array<{topics: string[]; questions: string[]}>;
}): StagePlanModelOutput {
  return {
    topics: topics.map(topic => ({topic})),
    questions,
    sections,
  } as unknown as StagePlanModelOutput;
}

describe("deterministic Stage Plan topic and question ownership", () => {
  it("accepts one exact owner of every planned topic and question", () => {
    const candidate = plan({
      topics: ["How monitoring works", "Coverage limitations"],
      questions: ["What is monitored?", "What is not protected?"],
      sections: [
        {topics: ["How monitoring works"], questions: ["What is monitored?"]},
        {topics: ["Coverage limitations"], questions: ["What is not protected?"]},
      ],
    });
    expect(inspectStagePlanCoverageOwnership(candidate)).toEqual([]);
  });

  it("detects planned topic and question missing their section owner", () => {
    const candidate = plan({
      topics: ["Included", "Unowned"],
      questions: ["Included?", "Unowned?"],
      sections: [{topics: ["Included"], questions: ["Included?"]}],
    });
    expect(inspectStagePlanCoverageOwnership(candidate)).toEqual([
      "plan.topics unowned:Unowned",
      "plan.questions unowned:Unowned?",
    ]);
  });

  it("detects duplicate owners and section references to unknown identities", () => {
    const candidate = plan({
      topics: ["Existing"],
      questions: ["Question?"],
      sections: [
        {topics: ["Existing", "Never planned"], questions: ["Question?"]},
        {topics: ["Existing"], questions: ["Question?", "Unknown?"]},
      ],
    });
    expect(inspectStagePlanCoverageOwnership(candidate)).toEqual([
      "sections[].topics unknown:Never planned",
      "sections[].questions unknown:Unknown?",
      "plan.topics multiple-owners:Existing",
      "plan.questions multiple-owners:Question?",
    ]);
  });

  it("preserves exact identity and never fuzzy-matches mismatched phrases", () => {
    const candidate = plan({
      topics: ["Credit monitoring"],
      questions: ["How does it work?"],
      sections: [{topics: ["credit monitoring"], questions: ["How does it work"]}],
    });
    expect(inspectStagePlanCoverageOwnership(candidate)).toEqual([
      "sections[].topics unknown:credit monitoring",
      "sections[].questions unknown:How does it work",
      "plan.topics unowned:Credit monitoring",
      "plan.questions unowned:How does it work?",
    ]);
  });

  it("performs inspection without modifying the source object", () => {
    const candidate = plan({
      topics: ["Same"],
      questions: ["One?"],
      sections: [{topics: ["Same"], questions: ["One?"]}],
    });
    const before = JSON.stringify(candidate);
    expect(inspectStagePlanCoverageOwnership(candidate)).toEqual([]);
    expect(JSON.stringify(candidate)).toBe(before);
  });

  it("leaves absent arrays to the existing structural completeness validator", () => {
    const malformed = {topics: null, questions: null, sections: null} as unknown as StagePlanModelOutput;
    expect(inspectStagePlanCoverageOwnership(malformed)).toEqual([]);
  });
});
