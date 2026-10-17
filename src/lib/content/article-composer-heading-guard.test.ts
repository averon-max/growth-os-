import { describe, expect, it } from "vitest";
import {
  assertDistinctArticleHeadingsV1,
  type ArticleShellV1,
} from "./master-article-composer";
import type { ArticleGenerationContractV1 } from "./article-generation-contract";

function fixture(h1: string, headings: string[]) {
  const shell = {
    version: "ARTICLE_SHELL_V1",
    title: "Test",
    metaDescription: "Test description",
    h1,
  } as ArticleShellV1;

  const contract = {
    sectionContracts: headings.map((heading) => ({
      blueprint: { heading },
    })),
  } as unknown as ArticleGenerationContractV1;

  return { shell, contract };
}

describe("canonical article heading integrity", () => {
  it("blocks identical H1 and H2", () => {
    const d = fixture("What Is Credit Monitoring?", ["What Is Credit Monitoring?"]);
    expect(() => assertDistinctArticleHeadingsV1(d.shell, d.contract))
      .toThrow("ARTICLE_COMPOSER_DUPLICATE_H1_H2");
  });

  it("blocks punctuation and case variants", () => {
    const d = fixture("What Is Credit Monitoring?", ["WHAT IS CREDIT MONITORING"]);
    expect(() => assertDistinctArticleHeadingsV1(d.shell, d.contract))
      .toThrow("ARTICLE_COMPOSER_DUPLICATE_H1_H2");
  });

  it("blocks duplicate H2 headings", () => {
    const d = fixture("Credit Monitoring", [
      "How Monitoring Works",
      "How monitoring works!",
    ]);
    expect(() => assertDistinctArticleHeadingsV1(d.shell, d.contract))
      .toThrow("ARTICLE_COMPOSER_DUPLICATE_H2");
  });

  it("accepts distinct headings", () => {
    const d = fixture("Credit Monitoring", [
      "What Is Credit Monitoring?",
      "How Credit Monitoring Works",
      "Limitations of Credit Monitoring",
    ]);
    expect(() => assertDistinctArticleHeadingsV1(d.shell, d.contract))
      .not.toThrow();
  });
});
