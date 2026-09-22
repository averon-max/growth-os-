import {
  ContentGenerationError,
  type ArticleCriticFinding,
} from "./generator";

const EDITORIAL_MINOR_CODE =
  /(?:TYPO|GRAMMAR|SPELL|PUNCT|BROKEN|MALFORMED|WHITESPACE|FORMATT|READABILITY|CLARITY|WORDING|EDITORIAL|CONSISTENCY)/i;

export function isRewriteWorthyEditorialMinor(
  finding:
    ArticleCriticFinding
): boolean {
  return (
    finding.severity ===
      "MINOR" &&
    EDITORIAL_MINOR_CODE.test(
      finding.code
    )
  );
}

export function shouldRewriteEditorialFindings(
  findings:
    ArticleCriticFinding[]
): boolean {
  return findings.some(
    isRewriteWorthyEditorialMinor
  );
}

export function assertEditorialFindingsResolved(
  findings:
    ArticleCriticFinding[]
): void {
  const unresolved =
    findings.filter(
      isRewriteWorthyEditorialMinor
    );

  if (
    unresolved.length ===
    0
  ) {
    return;
  }

  throw new ContentGenerationError(
    [
      "ARTICLE_EDITORIAL_REVIEW_FAILED",
      ...unresolved.map(
        (finding) =>
          `${finding.code}: ${finding.message}`
      ),
    ].join(
      " | "
    )
  );
}
