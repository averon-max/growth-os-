import {describe,expect,it} from "vitest";
import {buildStagePlanInformationGainRetryV1}
  from "./stage-plan-information-gain-retry-v1";
describe("one bounded semantic replan after real October 16 Stage Planner failure",()=>{
  it("gives the model the exact six affected H2 jobs and single generic fact",()=>{
    const headings=[
      "What Is Credit Monitoring?",
      "How Does Credit Monitoring Work?",
      "Important Limitations to Understand",
      "Does Monitoring Affect Your Credit Score?",
      "How To Choose Monitoring?",
      "What To Do With an Alert?",
    ];
    const sections=headings.map((heading,i)=>({
      heading,mission:"Distinct reader job "+i,
      questions:["question-"+i],
      requiredClaimIds:["claim-"+i],
    }));
    const claims=headings.map((heading,i)=>({
      id:"claim-"+i,text:"Generic fact for "+heading,
    }));
    const instructions=buildStagePlanInformationGainRetryV1({
      sections,claims,
    });
    expect(instructions).toContain(
      "STAGE_PLAN_INFORMATION_GAIN_CLAIM_BREADTH_RECOVERY_V1");
    expect(instructions).toContain("What Is Credit Monitoring?");
    expect(instructions).toContain("Important Limitations to Understand");
    expect(instructions).toContain("Generic fact for");
    expect(instructions).toContain("exactly-one-claim sections: 6");
    expect(instructions).toContain("Do NOT return the same");
    expect(instructions).toContain("HYPOTHESES");
    expect(instructions).toContain("Do NOT create filler H2/H3");
    expect(instructions).toContain("not a minimum quota");
    expect(instructions).toContain("complete Stage Plan JSON");
  });
  it("does not invent more claims for a short honest article",()=>{
    const guidance=buildStagePlanInformationGainRetryV1({
      sections:[
        {heading:"What is something?",requiredClaimIds:["claim-1"]},
        {heading:"How does it work?",requiredClaimIds:["claim-2"]},
      ],
      claims:[
        {id:"claim-1",text:"Verified fact one"},
        {id:"claim-2",text:"Verified fact two"},
      ],
    });
    expect(guidance).toBeNull();
  });
  it("does not demand fake breadth if existing section jobs already have facets",()=>{
    const result=buildStagePlanInformationGainRetryV1({
      sections:Array.from({length:6},(_,i)=>({
        heading:"How does facet "+i+" work?",
        requiredClaimIds:["claim-"+i+"a","claim-"+i+"b"],
      })),
      claims:[],
    });
    expect(result).toBeNull();
  });
});
