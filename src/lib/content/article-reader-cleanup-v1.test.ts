import {describe,expect,it} from "vitest";
import {previewArticleWithoutInlineSourceLabelsV1,
  draftSavedArticleSectionReferenceLayoutV1,
  draftCreditMonitoringExistingEditorialV1}
  from "./article-reader-cleanup-v1";
describe("visible article source label cleanup, original saved source untouched",()=>{
  it("moves two common FTC source formats outside running copy",()=>{
    const raw=[
      "## What to do after an alert?",
      "",
      "Contact the bureau. [Source: consumer.ftc.gov](https://consumer.ftc.gov/a). Keep copies.",
      "",
      "Ask the reporting company too. Source: [FTC](https://consumer.ftc.gov/b). Keep a record.",
    ].join("\n");
    const actual=previewArticleWithoutInlineSourceLabelsV1(raw);
    expect(actual.readerMarkdown).not.toContain("Source:");
    expect(actual.readerMarkdown).toContain("Contact the bureau.");
    expect(actual.readerMarkdown).toContain("Keep copies.");
    expect(actual.researchLinks.map(x=>x.url))
      .toEqual(["https://consumer.ftc.gov/a","https://consumer.ftc.gov/b"]);
    expect(raw).toContain("Source:");
    expect(actual.originalUnchanged).toBe(true);
  });
  it("leaves contextual citations and original headings unchanged",()=>{
    const raw="## Credit score\n\nRead [CFPB information](https://www.consumerfinance.gov/info) for details.";
    const actual=previewArticleWithoutInlineSourceLabelsV1(raw);
    expect(actual.readerMarkdown).toBe(raw);
    expect(actual.researchLinks).toHaveLength(0);
  });
});
describe("deterministic source format candidate for current signed article",()=>{
  it("relocates intrusive FTC references to their own H2 end; never drops or retargets a link",()=>{
    const body=[
      "## What is credit monitoring?",
      "",
      "Credit monitoring sends alerts. [Source: equifax.com](https://www.equifax.com/info) It watches reports.",
      "",
      "## What should you do after an alert?",
      "",
      "Contact the bureau. [Source: consumer.ftc.gov](https://consumer.ftc.gov/a) Keep records.",
      "",
      "Then check [CFPB advice](https://www.consumerfinance.gov/info).",
      "",
      "Source: [FTC](https://consumer.ftc.gov/b)",
    ].join("\n");
    const proposed=draftSavedArticleSectionReferenceLayoutV1(body);
    expect(proposed.changed).toBe(true);
    expect(proposed.movedSourceLabels).toBe(3);
    expect(proposed.h2Count).toBe(2);
    expect(proposed.sections.map(x=>x.movedSourceLabels)).toEqual([1,2]);
    expect(proposed.everyH2RetainsItsOwnUrls).toBe(true);
    expect(proposed.sections.map(x=>x.proposedUrlCount)).toEqual([1,3]);
    expect(proposed.sourceLabelsStillInline).toBe(false);
    expect(proposed.proposedBodyMarkdown).toContain("**References:**");
    expect(proposed.proposedBodyMarkdown).not.toContain("Source:");
    expect(proposed.proposedBodyMarkdown).toContain("Contact the bureau. Keep records.");
    expect(proposed.proposedBodyMarkdown).toContain(
      "[CFPB advice](https://www.consumerfinance.gov/info)");
    expect(proposed.safeToAutoCommit).toBe(false);
    expect(body).toContain("[Source: consumer.ftc.gov]");
  });
  it("is no-op on clean article with contextual hyperlinks",()=>{
    const raw="## Credit score\n\nCheck [CFPB](https://www.consumerfinance.gov/x).";
    const result=draftSavedArticleSectionReferenceLayoutV1(raw);
    expect(result.changed).toBe(false);
    expect(result.proposedBodyMarkdown).toBe(raw);
    expect(result.everyH2RetainsItsOwnUrls).toBe(true);
  });
});

describe("free existing saved credit-monitoring article draft",()=>{
  const stored=[
    "## What is credit monitoring?",
    "",
    "Credit monitoring watches for changes. [Source: equifax.com](https://www.equifax.com/learn)",
    "",
    "## How does credit monitoring work?",
    "",
    "The process has three connected stages. First, you register, then reports are checked and notifications are sent.",
    "",
    "Score access is related but distinct. Scores and report alerts do not show the same information.",
    "[Source: experian.com](https://www.experian.com/info)",
    "",
    "## What are the limitations of credit monitoring?",
    "",
    "### What monitoring may miss or explain incompletely",
    "",
    "A monitoring service cannot prevent every misuse of information.",
    "",
    "### What to do with the limitation",
    "",
    "Check your report and consider additional protections.",
    "",
    "## Does credit monitoring affect your credit score?",
    "",
    "Checking your own report is not a credit application.",
    "",
    "## What should you look for in a credit monitoring service?",
    "",
    "Review the offered alert coverage and participating bureaus.",
    "",
    "## What should you do after a credit monitoring alert?",
    "",
    "Contact the credit bureau and the reporting company. [Source: consumer.ftc.gov](https://consumer.ftc.gov/dispute) Keep relevant records.",
    "That creates a clear basis for describing the issue to both parties and for distinguishing the disputed information from details that are correct or still unclear.",
  ].join("\n");
  it("keeps exactly six H2, all URLs and original facts, adds two H3 before real paragraphs",()=>{
    const result=draftCreditMonitoringExistingEditorialV1(stored);
    expect(result.eligible).toBe(true);
    if(!result.eligible)throw new Error("NO_DRAFT");
    expect(result.h2Count).toBe(6);
    expect(result.h3Before).toBe(2);
    expect(result.h3After).toBe(4);
    expect(result.addedMeaningfulH3).toBe(2);
    expect(result.addedFactualClaims).toBe(0);
    expect(result.removedKnownCircularSentence).toBe(1);
    expect(result.sourceLabelsRelocated).toBe(3);
    expect(result.linkMultisetPreserved).toBe(true);
    expect(result.linksStillInOriginalH2).toBe(true);
    expect(result.draftBodyMarkdown).toContain(
      "### How monitoring services detect changes and send alerts");
    expect(result.draftBodyMarkdown).toContain(
      "### How credit monitoring differs from credit score access");
    expect(result.draftBodyMarkdown).toContain("Score access is related but distinct.");
    expect(result.draftBodyMarkdown).toContain("**References:**");
    expect(result.draftBodyMarkdown).not.toContain("[Source:");
    expect(result.draftBodyMarkdown).not.toContain("That creates a clear basis");
    expect(result.autoCommit).toBe(false);
    expect(result.requiresNewFingerprintAndReplay).toBe(true);
  });
  it("fails closed if real sentence anchors or exact section plan changed",()=>{
    const changed=stored.replace("Score access is related but distinct.",
      "Scores may differ between systems.");
    const candidate=draftCreditMonitoringExistingEditorialV1(changed);
    expect(candidate.eligible).toBe(false);
    expect(candidate.draftBodyMarkdown).toBe(null);
    expect(candidate.originalArticleUnchanged).toBe(true);
    const h2Drift=stored.replace("## How does credit monitoring work?",
      "## Why do credit reports change?");
    expect(draftCreditMonitoringExistingEditorialV1(h2Drift).eligible)
      .toBe(false);
  });
});
