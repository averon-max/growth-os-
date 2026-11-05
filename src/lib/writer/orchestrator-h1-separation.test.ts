import { describe, expect, it } from "vitest";
import {
  articleBodyToMarkdown,
  articleToMarkdown,
} from "./orchestrator";
import { extractArticleHeadings } from "../content/article-analyzer";

describe("Writer H1 ownership", () => {
  it("keeps the page H1 out of the stored bodyMarkdown", () => {
    const article = {
      h1: "Credit Monitoring: How It Works and Why It Matters",
      sections: [
        {
          level: 2,
          heading: "Definition",
          content: "Credit monitoring tracks changes to credit reports.",
        },
        {
          level: 3,
          heading: "Example",
          content: "An alert can flag an unfamiliar account.",
        },
      ],
    } as unknown as Parameters<typeof articleToMarkdown>[0];

    const fullMarkdown = articleToMarkdown(article);
    const bodyMarkdown = articleBodyToMarkdown(article);

    expect(
      extractArticleHeadings(fullMarkdown).filter(
        (heading) => heading.level === 1
      )
    ).toHaveLength(1);

    expect(
      extractArticleHeadings(bodyMarkdown).filter(
        (heading) => heading.level === 1
      )
    ).toHaveLength(0);

    expect(bodyMarkdown).toContain("## Definition");
    expect(bodyMarkdown).toContain("### Example");
  });
});
