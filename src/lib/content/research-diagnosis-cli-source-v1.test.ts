import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";

const cli=readFileSync(new URL("../../../scripts/content-existing-article-research-evidence-diagnose.ts",import.meta.url),"utf8");

describe("read-only saved-source research diagnostic",()=>{
  it("does not silently expand the historical 24 URL audit",()=>{
    expect(cli).toContain('const allSources=extras.includes("--all-sources")');
    expect(cli).toContain(".slice(0,allSources?64:24)");
  });
  it("accepts narrowly scoped section diagnostics without changing the saved plan",()=>{
    expect(cli).toContain('arg.startsWith("--focus=")');
    expect(cli).toContain('const focusedClaims=focus.size>0');
    expect(cli).toContain('claims:focusedClaims,sources,bodies:bodyRows');
    expect(cli).toContain('FOCUS_SECTIONS_NOT_IN_SAVED_PLAN');
  });
  it("does not run paid AI, DataForSEO or database mutations",()=>{
    expect(cli).toContain("aiCalls:0,dataForSeoCalls:0,databaseUnchanged:true");
    expect(cli).not.toContain("callContentAiJson(");
    expect(cli).not.toContain("buildSerpIntelligence(");
    expect(cli).not.toContain("prisma.contentArticle.update(");
  });
});
