import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("approve and publish shared release gate wiring", () => {
  const source = readFileSync(join(process.cwd(), "src/lib/content/service.ts"), "utf8");
  it("checks the same evidence, quality and replay gates before either action", () => {
    const ready = source.slice(source.indexOf("async function requireArticleReadyForReleaseV1("),
      source.indexOf("export async function approveArticle("));
    const ordered = [
      "detectPersistedArticleEditorialRepetitionV1(",
      "assertArticleProseHygieneV2(",
      "assertArticleInformationGainV1(",
      "assertStoredPublicationEvidenceV1(",
      "assertReleaseArticleCitationScopeV1(",
      "analyzeStoredContentPlan(",
      "auditArticle(",
      "evaluateContentGate(",
      "assertContentGatePassed(",
      "evaluateArticlePublicationPolicy(",
      "assertArticlePublicationPolicyPassed(",
      "evaluateComprehensiveEditorialReleaseV1(",
      "evaluateExplicitPublishGateV1(",
      "assertExplicitPublishGatePassedV1(",
    ];
    let last = -1;
    for (const name of ordered) {
      const next = ready.indexOf(name, last + 1);
      expect(next, name).toBeGreaterThan(last);
      last = next;
    }
  });
  it("blocks unsigned release citations before approval and CMS publish", () => {
    const ready = source.slice(
      source.indexOf("async function requireArticleReadyForReleaseV1("),
      source.indexOf("export async function approveArticle(")
    );
    expect(ready).toContain("assertReleaseArticleCitationScopeV1({");
    expect(ready.indexOf("assertReleaseArticleCitationScopeV1({"))
      .toBeLessThan(ready.indexOf("evaluateExplicitPublishGateV1({"));
    expect(ready).toContain("ARTICLE_RELEASE_RESEARCH_RUNTIME_MISSING");
  });
  it("preserves distinct status guards and uses release validation before persistence or CMS", () => {
    const approve = source.slice(source.indexOf("export async function approveArticle("),
      source.indexOf("export async function publishArticle("));
    const publish = source.slice(source.indexOf("export async function publishArticle("));
    expect(source).toContain('phase === "approve" && article.status !== "IN_REVIEW"');
    expect(source).toContain('phase === "publish" && article.status !== "APPROVED"');
    expect(approve.indexOf('requireArticleReadyForReleaseV1(articleId, "approve")')).toBeLessThan(approve.indexOf("prisma.contentArticle.update("));
    expect(publish.indexOf('requireArticleReadyForReleaseV1(articleId, "publish")')).toBeLessThan(publish.indexOf("provider.publishContent("));
    expect(publish.indexOf("provider.publishContent(")).toBeLessThan(publish.indexOf("prisma.contentArticle.update("));
  });
});
