import {describe,expect,it} from "vitest";
import {inspectStagePlanInformationGainV1,INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1} from "./stage-plan-information-gain-v1";

describe("plan information-gain breadth before paid Writer",()=>{
  it("detects six long-form explanatory jobs with exactly one generic claim each",()=>{
    const titles=[
      "What is credit monitoring?",
      "How does credit monitoring work?",
      "What are its limitations?",
      "Does monitoring affect scores?",
      "What should readers look for?",
      "What should readers do after an alert?",
    ];
    const result=inspectStagePlanInformationGainV1(
      titles.map((heading,i)=>({heading,requiredClaimIds:["claim-"+i]}))
    );
    expect(result).toMatchObject({
      insufficient:true,explanatorySections:6,oneClaimSections:6,
      issueCode:"sections[].informationGainClaimBreadth",
    });
  });
  it("passes a detailed plan with distinct atomic facts assigned to each section",()=>{
    const sections=Array.from({length:6},(_,i)=>({
      heading:"How does facet "+i+" work?",
      requiredClaimIds:["claim-"+i+"-direct","claim-"+i+"-detail"],
    }));
    expect(inspectStagePlanInformationGainV1(sections).insufficient).toBe(false);
  });
  it("does not enforce an arbitrary second claim on a short simple article",()=>{
    const sections=Array.from({length:3},(_,i)=>({
      heading:"What is term "+i+"?",
      requiredClaimIds:["fact-"+i],
    }));
    expect(inspectStagePlanInformationGainV1(sections).insufficient).toBe(false);
  });
  it("does not penalize unrelated non-explanatory sections with single factual anchors",()=>{
    const sections=Array.from({length:6},(_,i)=>({
      heading:"Option "+i,requiredClaimIds:["fact-"+i],
    }));
    expect(inspectStagePlanInformationGainV1(sections).insufficient).toBe(false);
  });
  it("does not accept a plan that adds unrelated synthetic claims to a separate section",()=>{
    const sections=[
      ...Array.from({length:5},(_,i)=>({
        heading:"How does question "+i+" work?",requiredClaimIds:["claim-"+i],
      })),
      {heading:"Other topic",requiredClaimIds:["fact-a","fact-b","fact-c"]},
    ];
    expect(inspectStagePlanInformationGainV1(sections).insufficient).toBe(true);
  });
  it("keeps explicit source verification and no-quota rules in the planner contract",()=>{
    expect(INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1).toContain(
      "research HYPOTHESIS");
    expect(INFORMATION_GAIN_ATOMIC_CLAIM_PLANNING_RULES_V1).toContain(
      "Do not add a second claim solely to meet a number");
  });
});
