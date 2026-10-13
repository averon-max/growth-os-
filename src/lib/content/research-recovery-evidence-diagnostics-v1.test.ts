import {describe,expect,it} from "vitest";
import {
  inspectResearchRecoveryEvidenceV1,
} from "./research-recovery-evidence-diagnostics-v1";
const claims=[{
  id:"research-section-1-0",sectionId:"section-1",
  text:"Credit monitoring tracks changes in a consumer credit report.",
},{
  id:"research-section-2-0",sectionId:"section-2",
  text:"A monitoring service checks information at intervals rather than continuously.",
}];
const sources=[
  {id:"official",url:"https://official.example.org/guide"},
  {id:"secondary",url:"https://secondary.example.org/explain"},
];
describe("offline research evidence diagnosis",()=>{
  it("counts strict matches without promoting or mutating evidence",()=>{
    const result=inspectResearchRecoveryEvidenceV1({
      claims,sources,
      bodies:[{
        sourceId:"official",status:"FETCHED",
        bodyText:"Credit monitoring tracks changes in a consumer credit report. "+
          "Some services notify customers about changes to their report.",
      },{
        sourceId:"secondary",status:"FETCH_FAILED",bodyText:null,
      }],
    });
    expect(result.fetchedSources).toBe(1);
    expect(result.verifiedClaims).toBe(1);
    expect(result.claimDiagnostics[0]).toMatchObject({
      verdict:"LEXICALLY_VERIFIED_NOT_SEMANTICALLY_REVIEWED",
      strictMatches:1,
    });
    expect(result.claimDiagnostics[0].strictSourceDomains)
      .toEqual(["official.example.org"]);
    expect(result.claimDiagnostics[1].strictMatches).toBe(0);
  });
  it("does not invent an excerpt from missing or empty pages",()=>{
    const result=inspectResearchRecoveryEvidenceV1({
      claims,sources,
      bodies:[{
        sourceId:"official",status:"FETCH_FAILED",bodyText:null,
      }],
    });
    expect(result.verifiedClaims).toBe(0);
    expect(result.unmatchedClaims).toBe(2);
    expect(result.claimDiagnostics[0].bestStrict).toHaveLength(0);
  });
  it("distinguishes near source context from verified claims",()=>{
    const result=inspectResearchRecoveryEvidenceV1({
      claims:[claims[1]],sources:[sources[0]],
      bodies:[{
        sourceId:"official",status:"FETCHED",
        bodyText:"Credit monitoring services can help consumers monitor "+
          "their credit information and discover changes. Notifications "+
          "may be sent to customers when relevant updates are detected.",
      }],
    });
    expect(result.verifiedClaims).toBe(0);
    expect(result.claimDiagnostics[0].strictMatches).toBe(0);
    expect(result.warning).toContain("no source is promoted");
  });
});
