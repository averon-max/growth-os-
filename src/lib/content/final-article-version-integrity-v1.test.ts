import { describe, expect, it } from "vitest";
import {
  assertFinalArticleVersionIntegrityV1,
} from "./final-article-version-integrity-v1";

describe("Final article version integrity", () => {
  it("accepts identical final article", () => {
    expect(() =>
      assertFinalArticleVersionIntegrityV1({
        writerMarkdown: "## Heading\\n\\nVerified article.",
        finalMarkdown: "## Heading\\n\\nVerified article.",
      })
    ).not.toThrow();
  });

  it("blocks changes after Writer verification", () => {
    expect(() =>
      assertFinalArticleVersionIntegrityV1({
        writerMarkdown: "## Heading\\n\\nOriginal",
        finalMarkdown: "## Heading\\n\\nChanged",
      })
    ).toThrow(
      "FINAL_ARTICLE_VERSION_DRIFT_REVALIDATION_REQUIRED"
    );
  });

  it("blocks an empty final article", () => {
    expect(() =>
      assertFinalArticleVersionIntegrityV1({
        writerMarkdown: "Original",
        finalMarkdown: "",
      })
    ).toThrow("FINAL_ARTICLE_VERSION_EMPTY");
  });
});
