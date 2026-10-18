import { describe, it, expect } from "vitest";
import {
  analyzeCompetitorDocumentDepthV1,
  aggregateObservedBodyTermsV1,
} from "./competitor-document-depth-v1";

const passage = "Credit monitoring sends alerts when credit reports change. "+
  "Different services may monitor different bureaus and features. "+
  "A consumer should verify the stated coverage before choosing a provider. ";

function fixture() {
  return `<!doctype html><html><head>
    <title>Credit Monitoring Explained: A Consumer Guide</title></head><body>
    <nav>${"Unrelated navigation menu ".repeat(150)}</nav>
    <article><h1>Credit Monitoring Explained</h1>
      <h2>How Does Credit Monitoring Work?</h2>
      <p>${passage.repeat(12)}</p>
      <h3>What Alerts Does It Send?</h3>
      <p>${passage.repeat(8)}</p>
      <h2>Questions to Ask Before Choosing</h2>
      <p>${passage.repeat(5)}</p>
      <footer>${"Advertiser navigation ".repeat(90)}</footer>
    </article></body></html>`;
}

describe("deep competitor document measurements", () => {
  it("extracts ordered H2/H3, actual section sizes and literal keyword mentions", () => {
    const result = analyzeCompetitorDocumentDepthV1(fixture(), "credit monitoring");
    expect(result.version).toBe("OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1");
    expect(result.extraction).toBe("MAIN_ARTICLE");
    expect(result.wordCount).toBeGreaterThan(200);
    expect(result.sections.map(s=>[s.level,s.heading])).toEqual([
      [2,"How Does Credit Monitoring Work?"],
      [3,"What Alerts Does It Send?"],
      [2,"Questions to Ask Before Choosing"],
    ]);
    expect(result.sections[0]?.wordCount).toBeGreaterThan(
      result.sections[1]?.wordCount ?? 0
    ); // parent H2 includes child H3
    expect(result.sections[2]?.wordCount).toBeGreaterThan(50);
    expect(result.keywordUsage.title).toBe(1);
    expect(result.keywordUsage.h1).toBe(1);
    expect(result.keywordUsage.headings).toBe(1);
    expect(result.keywordUsage.mainContent).toBeGreaterThan(10);
    expect(result.headingQuestions).toEqual([
      "How Does Credit Monitoring Work?","What Alerts Does It Send?",
    ]);
    expect(result.bodyTerms.some(row => row.term==="credit monitoring" &&
      row.occurrences>=20)).toBe(true);
    expect(result.bodyTerms.some(row => row.term.includes("navigation"))).toBe(false);
  });

  it("marks body-only fallback and never fabricates sections", () => {
    const result = analyzeCompetitorDocumentDepthV1(
      "<html><body><p>No article or heading.</p></body></html>",
      "credit monitoring",
    );
    expect(result.extraction).toBe("BODY_FALLBACK");
    expect(result.sections).toEqual([]);
    expect(result.keywordUsage.mainContent).toBe(0);
  });

  it("calculates corpus coverage by independent readable pages, not repetitions", () => {
    const rows = aggregateObservedBodyTermsV1([
      {fetched:true,bodyTerms:[{term:"credit monitoring",occurrences:30},
        {term:"fraud alerts",occurrences:4}]},
      {fetched:true,bodyTerms:[{term:"credit monitoring",occurrences:3},
        {term:"bureau coverage",occurrences:6}]},
      {fetched:true,bodyTerms:[{term:"bureau coverage",occurrences:4}]},
      {fetched:false,bodyTerms:[{term:"fraud alerts",occurrences:900}]},
    ]);
    expect(rows).toContainEqual({
      term:"credit monitoring",pages:2,coveragePct:66.7,totalOccurrences:33,
    });
    expect(rows).toContainEqual({
      term:"bureau coverage",pages:2,coveragePct:66.7,totalOccurrences:10,
    });
    expect(rows.some(row => row.term==="fraud alerts")).toBe(false);
  });
});
