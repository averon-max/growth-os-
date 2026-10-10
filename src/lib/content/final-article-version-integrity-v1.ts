import { createHash } from "node:crypto";

export function assertFinalArticleVersionIntegrityV1({
  writerMarkdown,
  finalMarkdown,
}: {
  writerMarkdown: string;
  finalMarkdown: string;
}): void {
  if (
    typeof writerMarkdown !== "string" ||
    typeof finalMarkdown !== "string" ||
    !writerMarkdown.trim() ||
    !finalMarkdown.trim()
  ) {
    throw new Error("FINAL_ARTICLE_VERSION_EMPTY");
  }

  const hash = (value: string) =>
    createHash("sha256").update(value, "utf8").digest("hex");

  if (hash(writerMarkdown) !== hash(finalMarkdown)) {
    throw new Error(
      "FINAL_ARTICLE_VERSION_DRIFT_REVALIDATION_REQUIRED"
    );
  }
}
