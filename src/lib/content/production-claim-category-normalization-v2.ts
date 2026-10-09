import type {
  ClaimCategory,
} from "./claim-ledger";


/*
 * PRODUCTION_CLAIM_CATEGORY_NORMALIZATION_V2
 *
 * LEGAL is reserved for an actual legal/regulatory proposition.
 *
 * Being about insurance / finance / credit does NOT itself make
 * a proposition legal.
 *
 * ClaimLedger remains the final evidence-policy authority.
 */
export function normalizeProductionClaimCategoryV2({
  category,
  text,
}: {
  category:
    ClaimCategory;

  text:
    string;
}): ClaimCategory {
  if (
    category !==
    "LEGAL"
  ) {
    return category;
  }


  const normalized =
    text
      .normalize(
        "NFKC"
      )
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  const actualLegalLanguage =
    [
      /\blaw\b/,
      /\blaws\b/,
      /\blegal\b/,
      /\bregulation\b/,
      /\bregulations\b/,
      /\bregulatory\b/,
      /\bstatute\b/,
      /\bstatutory\b/,
      /\blegislation\b/,
      /\bcourt\b/,
      /\bregulator\b/,
      /\bregulators\b/,
      /\blegal right\b/,
      /\blegal rights\b/,
      /\blegal obligation\b/,
      /\blegal obligations\b/,
      /\brequired by law\b/,
      /\bprohibited by law\b/,
      /\bmandated by law\b/,
      /\bunder federal law\b/,
      /\bunder state law\b/,
    ].some(
      (
        pattern
      ) =>
        pattern.test(
          normalized
        )
    );


  if (
    actualLegalLanguage
  ) {
    return "LEGAL";
  }


  const productOrCoverageLanguage =
    [
      /\binsurance\b/,
      /\bcoverage\b/,
      /\bcover\b/,
      /\bcovers\b/,
      /\bcovered\b/,
      /\breimburse\b/,
      /\breimburses\b/,
      /\breimbursement\b/,
      /\bservice\b/,
      /\bservices\b/,
      /\bproduct\b/,
      /\bproducts\b/,
      /\bfeature\b/,
      /\bfeatures\b/,
      /\bplan\b/,
      /\bplans\b/,
      /\bprovider\b/,
      /\bproviders\b/,
      /\bspecialist\b/,
      /\bspecialists\b/,
    ].some(
      (
        pattern
      ) =>
        pattern.test(
          normalized
        )
    );


  if (
    productOrCoverageLanguage
  ) {
    return "PRODUCT";
  }


  /*
   * Conservative default:
   * ambiguous LEGAL remains LEGAL.
   */
  return "LEGAL";
}
