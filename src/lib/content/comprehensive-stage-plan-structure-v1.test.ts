import {describe,expect,it} from "vitest";
import {inspectComprehensiveStagePlanStructureV1 as audit}
  from "./comprehensive-stage-plan-structure-v1";
const sections=(n:number)=>Array.from({length:n},(_,i)=>({
  heading:"What should I know about facet "+i+"?",
  mission:"Explain a distinct factual reader job "+i,
}));
describe("no 1-2 H2 comprehensive article can reach paid Writer",()=>{
  it.each([1,2,3,4,5])("holds a %i H2 longform plan",n=>{
    const result=audit({
      intent:"INFORMATIONAL",pageType:"explainer",
      sections:sections(n),
    });
    expect(result.insufficient).toBe(true);
    expect(result.minimumH2).toBe(6);
    expect(result.issueCode).toBe("sections[].comprehensiveReaderJobs");
  });
  it("passes six distinct factual jobs",()=>{
    const result=audit({
      intent:"INFORMATIONAL",pageType:"explainer",
      sections:sections(6),
    });
    expect(result.insufficient).toBe(false);
    expect(result.uniqueJobs).toBe(6);
  });
  it("rejects six headings that are synonyms for ONE identical task",()=>{
    const result=audit({
      intent:"INFORMATIONAL",pageType:"EXPLAINER_GUIDE",
      sections:sections(6).map(s=>({...s,mission:"Answer one same question"})),
    });
    expect(result.insufficient).toBe(true);
    expect(result.uniqueJobs).toBe(1);
  });
  it("does not impose comprehensive structure onto a true short FAQ",()=>{
    const result=audit({
      intent:"INFORMATIONAL",pageType:"FAQ",
      sections:sections(2),
    });
    expect(result.insufficient).toBe(false);
    expect(result.minimumH2).toBeNull();
  });
});
