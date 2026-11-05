import { describe, expect, it } from "vitest";
import {
  countArticleWorkspaceKeywordsV1,
  getArticleWorkspaceHeadingsV1,
} from "./article-workspace-counts-v1";

describe("article workspace counters", () => {
  it("counts H1-H6 and ignores heading-like text inside fenced code", () => {
    const body = [
      "## Definition",
      "### Process",
      "#### Details",
      "##### Further details",
      "###### Deepest level",
      "",
      "```markdown",
      "# This is an example, not a heading",
      "#### Nor is this",
      "```",
    ].join("\n");

    const headings = getArticleWorkspaceHeadingsV1("Main topic", body);

    expect(headings.map((item) => item.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("counts a real H1 inside the body instead of hiding a duplicate", () => {
    const headings = getArticleWorkspaceHeadingsV1(
      "Main topic",
      "# Main topic\n\n## Definition"
    );

    expect(headings.filter((item) => item.level === 1)).toHaveLength(2);
  });

  it("counts exact keyword mentions live across title, H1 and body", () => {
    const result = countArticleWorkspaceKeywordsV1({
      title: "Credit monitoring guide",
      h1: "Credit Monitoring",
      bodyMarkdown:
        "Credit monitoring detects changes. Free credit monitoring gives alerts. Credit monitoring is ongoing.",
      primaryKeyword: "credit monitoring",
      plannedKeywords: [
        { keyword: "free credit monitoring", role: "Secondary" },
        { keyword: "CREDIT MONITORING", role: "Primary" },
        { keyword: "missing phrase", role: "Secondary" },
      ],
    });

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      keyword: "credit monitoring",
      role: "Primary",
      mentions: 5,
    });
    expect(result.rows[1]).toMatchObject({
      keyword: "free credit monitoring",
      role: "Secondary",
      mentions: 1,
    });
    expect(result.used).toBe(2);
    expect(result.missing).toBe(1);
    expect(result.totalMentions).toBe(6);
    expect(result.coveragePct).toBe(67);
  });
});
