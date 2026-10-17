import { describe, expect, it } from "vitest";
import { recoverConflictingArticleH1V1 } from "./master-writer-orchestrator";
import type { ArticleGenerationContractV1 } from "./article-generation-contract";

function contract(headings: string[]) {
  return {
    sectionContracts: headings.map(heading => ({
      blueprint: { heading },
    })),
  } as unknown as ArticleGenerationContractV1;
}

describe("Master Writer H1 Recovery", () => {
  it("uses a unique existing title when H1 conflicts with H2", () => {
    const shell = {
      version: "ARTICLE_SHELL_V1" as const,
      title: "Credit Monitoring Explained",
      h1: "What Is Credit Monitoring?",
      metaDescription: "Guide to credit monitoring",
    };

    const result = recoverConflictingArticleH1V1(
      shell,
      contract(["What Is Credit Monitoring?", "Important Limitations"])
    );

    expect(result.h1).toBe("Credit Monitoring Explained");
    expect(shell.h1).toBe("What Is Credit Monitoring?");
  });

  it("fails closed when the title also conflicts", () => {
    const shell = {
      version: "ARTICLE_SHELL_V1" as const,
      title: "What Is Credit Monitoring?",
      h1: "What Is Credit Monitoring?",
      metaDescription: "Guide to credit monitoring",
    };

    expect(() =>
      recoverConflictingArticleH1V1(
        shell,
        contract(["What Is Credit Monitoring?"])
      )
    ).toThrow("ARTICLE_COMPOSER_DUPLICATE_H1_H2");
  });

  it("preserves an already valid H1", () => {
    const shell = {
      version: "ARTICLE_SHELL_V1" as const,
      title: "Credit Monitoring Guide",
      h1: "Credit Monitoring Explained",
      metaDescription: "Guide to credit monitoring",
    };

    expect(
      recoverConflictingArticleH1V1(
        shell,
        contract(["How Monitoring Works"])
      )
    ).toBe(shell);
  });
});
