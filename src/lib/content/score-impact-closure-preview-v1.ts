import { createHash } from "node:crypto";

export const SCORE_IMPACT_HEADING_V1 =
  "Does Credit Monitoring Affect Your Credit Score?";
export const SCORE_IMPACT_DIRECT_CLAIM_V1 =
  "Credit monitoring has no impact on your credit scores.";
export const SCORE_IMPACT_DIRECT_CLAIM_ID_V1 =
  "claim-monitoring-score-direct-answer-v1";

type SavedSection = Readonly<{ heading: string; bodyMarkdown: string }>;

const replacementBody = [
  "**No. Credit monitoring itself does not lower your credit score.** Credit monitoring watches for changes in credit information; it does not change the score simply by checking for updates. Experian explicitly confirms that monitoring has no impact on credit scores. ([Experian](https://www.experian.com/blogs/ask-experian/does-credit-monitoring-hurt-credit-score/))",
  "",
  "### Soft inquiries versus hard inquiries",
  "",
  "When you check your own credit information, or an authorized monitoring service reviews it, that is generally a soft inquiry. Soft inquiries do not affect credit scores. A hard inquiry is different: it can happen when a lender reviews credit in connection with a loan or credit card application. That kind of inquiry may affect your score. The Consumer Financial Protection Bureau explains this distinction in its [guidance about credit inquiries](https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-inquiry-en-1317/).",
  "",
  "An alert is not the cause of a score change. If a monitoring service notifies you that a score or account detail has changed, the alert points you toward information worth reviewing. It does not establish why the score changed. Look at the underlying credit report entries and the type of inquiry involved rather than assuming the monitoring service triggered the change.",
  "",
  "### What to check when an alert arrives",
  "",
  "For example, receiving an alert soon after submitting a credit application does not mean that receiving the alert affected your score. Any potential impact comes from the underlying credit activity, not from the notification itself. Likewise, checking a report to understand an unfamiliar change does not create the same score impact as applying for new credit.",
  "",
  "Start by reviewing the reported activity. Identify whether the inquiry is soft or hard, and check that the account information is familiar and accurate. If the report shows activity you do not recognize, use the credit reporting agency's official instructions for reviewing or disputing the information.",
  "",
  "This explanation concerns U.S. consumer credit reporting. Practices and terminology may differ elsewhere.",
].join("\n");

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Offline, REVIEW-ONLY article rescue, not a production article writer.
 * It takes a checkpoint (4 untouched sections), a literal verified source
 * quote, and replaces ONLY section #4. The old unsupported claim is not
 * changed or silently assigned the new claim's evidence.
 */
export function composeScoreImpactClosurePreviewV1({
  h1,
  sections,
  verifiedDirectQuote,
}: {
  h1: string;
  sections: readonly SavedSection[];
  verifiedDirectQuote: string | null;
}): Readonly<{
  markdown: string;
  sectionHashesBefore: readonly string[];
  sectionHashesAfter: readonly string[];
  changedSectionIndexes: readonly number[];
  wordCount: number;
  newClaimId: string;
  readiness: "REVIEW_ONLY";
}> {
  if (verifiedDirectQuote !== SCORE_IMPACT_DIRECT_CLAIM_V1) {
    throw new Error("CLOSURE_PREVIEW_DIRECT_CLAIM_NOT_VERIFIED");
  }
  if (!h1.trim() || sections.length !== 5 ||
      sections[3]?.heading !== SCORE_IMPACT_HEADING_V1 ||
      sections.some(section => !section.heading.trim() || !section.bodyMarkdown.trim())) {
    throw new Error("CLOSURE_PREVIEW_CHECKPOINT_SECTIONS_INVALID");
  }
  const before = sections.map(section => digest(section.bodyMarkdown));
  const updated = sections.map((section, index) => ({
    heading: section.heading,
    bodyMarkdown: index === 3 ? replacementBody : section.bodyMarkdown,
  }));
  const after = updated.map(section => digest(section.bodyMarkdown));
  const changedSectionIndexes = after.flatMap((hash, index) =>
    hash !== before[index] ? [index] : []);
  if (changedSectionIndexes.length !== 1 || changedSectionIndexes[0] !== 3) {
    throw new Error("CLOSURE_PREVIEW_PRESERVATION_FAILED");
  }
  // Preserve the raw original section strings, including any
  // intentional whitespace. Only the replacement section is new.
  const markdown = "# " + h1.trim() + "\n\n" +
    updated.map(section =>
      "## " + section.heading + "\n\n" + section.bodyMarkdown
    ).join("\n\n") + "\n";
  return Object.freeze({
    markdown,
    sectionHashesBefore: Object.freeze(before),
    sectionHashesAfter: Object.freeze(after),
    changedSectionIndexes: Object.freeze(changedSectionIndexes),
    wordCount: markdown.trim().split(/\s+/).length,
    newClaimId: SCORE_IMPACT_DIRECT_CLAIM_ID_V1,
    readiness: "REVIEW_ONLY" as const,
  });
}
