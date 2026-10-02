export type ContentRiskProfileV1 =
  | "STANDARD"
  | "YMYL_HEALTH"
  | "YMYL_FINANCE"
  | "YMYL_LEGAL"
  | "YMYL_SAFETY";


export interface ContentRiskProfileInputV1 {
  readonly query:
    string;

  readonly riskClass?:
    string | null;
}


function text(
  value:
    string | null | undefined
): string {
  return (
    value ??
    ""
  )
    .trim()
    .toLowerCase();
}


export function deriveContentRiskProfileV1({
  query,
  riskClass,
}: Readonly<ContentRiskProfileInputV1>):
ContentRiskProfileV1 {
  const q =
    text(query);

  const risk =
    text(riskClass);


  if (
    /\bhealth|medical|medicine|nutrition|diet|disease|diagnos|symptom|vitamin|supplement|calorie|protein|allergy|pregnan|doctor\b/i
      .test(`${risk} ${q}`)
  ) {
    return "YMYL_HEALTH";
  }


  if (
    /\bfinance|financial|credit|loan|mortgage|bank|invest|insurance|debt|tax|retirement|interest rate|identity protection\b/i
      .test(`${risk} ${q}`)
  ) {
    return "YMYL_FINANCE";
  }


  if (
    /\blegal|law|lawyer|attorney|court|claim|lawsuit|liability|contract|regulation|statute\b/i
      .test(`${risk} ${q}`)
  ) {
    return "YMYL_LEGAL";
  }


  if (
    /\bsafety|danger|hazard|emergency|security|cybersecurity|breach|fire|electrical|structural\b/i
      .test(`${risk} ${q}`)
  ) {
    return "YMYL_SAFETY";
  }


  return "STANDARD";
}


export function buildRiskProfilePromptV1(
  profile:
    ContentRiskProfileV1
): string {
  if (
    profile ===
    "STANDARD"
  ) {
    return [
      "CONTENT_RISK_PROFILE_V1: STANDARD",
      "Use the normal evidence contract.",
      "Material factual claims still require the existing ClaimLedger/EvidenceGraph authority.",
    ].join("\n");
  }


  return [
    `CONTENT_RISK_PROFILE_V1: ${profile}`,
    "This is a higher-trust content domain.",
    "Do not create factual claims from general model knowledge.",
    "Material claims must be supported by authoritative verified evidence.",
    "Do not invent prices, rates, guarantees, health outcomes, legal conclusions, safety claims, statistics, certifications, or recommendations.",
    "When evidence is insufficient, omit or narrow the claim instead of guessing.",
    "Separate educational explanation from individualized advice.",
  ].join("\n");
}
