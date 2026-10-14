import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {rankOfficialProceduralFactSentencesV1}
  from "./live-evidence-verification";

const ftc="If you find an inaccurate item in your credit report, "+
  "contact the credit bureau and dispute the information in writing.";
const cfpb="If you do not recognize a creditor on your credit report, "+
  "you should contact the company to learn more about the account.";
const offTopic="Credit monitoring services send monthly alerts "+
  "about score changes and offer new monitoring subscriptions.";
const opts={
  heading:"What should you do after a credit monitoring alert?",
  mission:"Explain how to respond to an unfamiliar credit account.",
};
describe("source-first official procedural sentence discovery",()=>{
  it("extracts real correction and investigation steps instead of matching hypotheses",()=>{
    const found=rankOfficialProceduralFactSentencesV1({
      ...opts,bodyText:[ftc,cfpb,offTopic].join(" "),
    });
    expect(found.map(f=>f.excerpt)).toContain(ftc);
    expect(found.map(f=>f.excerpt)).toContain(cfpb);
    expect(found.map(f=>f.excerpt)).not.toContain(offTopic);
    expect(found.every(f=>f.coverage>=0.35)).toBe(true);
  });
  it("does not turn product descriptions into steps",()=>{
    expect(rankOfficialProceduralFactSentencesV1({
      ...opts,bodyText:offTopic,
    })).toEqual([]);
  });
  it("does not inject procedure claims into non-action section headings",()=>{
    expect(rankOfficialProceduralFactSentencesV1({
      heading:"What is credit monitoring?",
      mission:"Explain the definition of credit monitoring",
      bodyText:ftc,
    })).toEqual([]);
  });
  it("requires a topical connection even when a source says contact",()=>{
    const unrelated="If you have a problem with garden plants, "+
      "you should contact your local horticultural society immediately.";
    expect(rankOfficialProceduralFactSentencesV1({
      ...opts,bodyText:unrelated,
    })).toEqual([]);
  });
  it("still requires strict and semantic review for every literal fact",()=>{
    const engine=readFileSync(new URL("./existing-article-research-recovery-v1.ts",
      import.meta.url),"utf8");
    expect(engine).toContain("collectOfficialSectionProcedureCandidatesV1({");
    expect(engine).toContain('factAuthority:"CANDIDATE_ONLY"');
    expect(engine).toContain("claims:changed,maxSources:72");
    expect(engine).toContain("reviewAndConstrainVerifiedEvidenceV1({");
    expect(engine).toContain("strictBySection.every(section=>section.lexicallyVerified>=2)");
  });
});
