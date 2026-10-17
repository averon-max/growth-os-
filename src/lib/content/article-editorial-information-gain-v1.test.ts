import {describe,expect,it} from "vitest";
import {
  detectArticleInformationGainDefectsV1,
  assertArticleInformationGainV1,
  ArticleInformationGainGateErrorV1,
} from "./article-editorial-information-gain-v1";
describe("screenshot: one fact padded into empty financial advice",()=>{
  const body=[
    "## What to do after an alert?",
    "",
    "If you find inaccurate information in your report, contact the credit bureau and the business that reported it. Source: [consumer.ftc.gov](https://consumer.ftc.gov/articles/disputing-errors-your-credit-reports)",
    "",
    "Keep your explanation focused on the specific information you believe is wrong, and retain relevant records for your files. That creates a clear basis for describing the issue to both parties and for distinguishing the disputed information from details that are correct or still unclear.",
  ].join("\n");
  it("flags handwavy second sentence AND disruptive source label",()=>{
    const findings=detectArticleInformationGainDefectsV1(body);
    expect(findings.map(x=>x.code).sort()).toEqual([
      "NON_ACTIONABLE_JUSTIFICATION","SOURCE_LABEL_IN_PROSE",
    ]);
    expect(findings.every(x=>x.sectionIndex===0)).toBe(true);
    expect(()=>assertArticleInformationGainV1(body))
      .toThrow(ArticleInformationGainGateErrorV1);
  });
  it("retains precise supported actionable prose",()=>{
    const clear=[
      "## What to do after an alert?",
      "",
      "Identify the account or address you do not recognize. Contact the bureau that issued the report and the company that submitted the entry. Keep a copy of your dispute and the supporting documents.",
      "",
      "The next action depends on whether the entry is a reporting error or an account opened without your permission.",
    ].join("\n");
    expect(detectArticleInformationGainDefectsV1(clear)).toEqual([]);
  });
  it("does not flag ordinary evidence citation without Source colon",()=>{
    const cited="## Credit score\n\nChecking your own report does not lower your score ([CFPB guidance](https://www.consumerfinance.gov/consumer-tools/credit-reports/answers/key-terms/)).";
    expect(detectArticleInformationGainDefectsV1(cited)).toEqual([]);
  });
});