export type BusinessFactRegistryVersion =
  | "BOOTSTRAP_V1"
  | "PERSISTED_V1";

export interface BusinessFactRegistry {
  version: BusinessFactRegistryVersion;
  businessName: string;
  websiteUrl: string;
  industry: string | null;
  verifiedClaims: string[];
  factIds: string[];
  prohibitedClaimCategories: string[];
}

const PROHIBITED_CLAIM_CATEGORIES = [
  "dataset size",
  "customer or user counts",
  "dark-web monitoring",
  "stealer-log coverage",
  "breach-database coverage",
  "real-time monitoring",
  "guarantees",
  "awards",
  "superlatives",
  "unsupported product capabilities",
];

export function buildBootstrapBusinessFactRegistry({
  businessName,
  websiteUrl,
  industry,
}: {
  businessName: string;
  websiteUrl: string;
  industry?: string | null;
}): BusinessFactRegistry {
  return {
    version: "BOOTSTRAP_V1",
    businessName: businessName.trim(),
    websiteUrl: websiteUrl.trim(),
    industry: industry?.trim() || null,
    verifiedClaims: [],
    factIds: [],
    prohibitedClaimCategories: [
      ...PROHIBITED_CLAIM_CATEGORIES,
    ],
  };
}

export function buildPersistedBusinessFactRegistry({
  businessName,
  websiteUrl,
  industry,
  facts,
}: {
  businessName: string;
  websiteUrl: string;
  industry?: string | null;
  facts: Array<{
    id: string;
    claim: string;
  }>;
}): BusinessFactRegistry {
  return {
    version: "PERSISTED_V1",
    businessName: businessName.trim(),
    websiteUrl: websiteUrl.trim(),
    industry: industry?.trim() || null,
    verifiedClaims: facts
      .map((fact) => fact.claim.trim())
      .filter(Boolean),
    factIds: facts.map(
      (fact) => fact.id
    ),
    prohibitedClaimCategories: [
      ...PROHIBITED_CLAIM_CATEGORIES,
    ],
  };
}

export function businessFactPrompt(
  registry: BusinessFactRegistry
): string {
  const verified =
    registry.verifiedClaims.length > 0
      ? registry.verifiedClaims
          .map(
            (claim) =>
              `- ${claim}`
          )
          .join("\n")
      : "- No product capability, metric, dataset-size, monitoring, coverage, customer-count, guarantee, award, or superlative claim is currently verified.";

  return [
    `BUSINESS FACT REGISTRY: ${registry.version}`,
    `Business: ${registry.businessName}`,
    `Website: ${registry.websiteUrl}`,
    registry.industry
      ? `Industry context: ${registry.industry}`
      : "",
    "",
    "VERIFIED CLAIMS:",
    verified,
    "",
    "FACTUAL POLICY:",
    "- Only VERIFIED CLAIMS may be used as factual product claims.",
    "- Do not infer capabilities from the company name, industry, URL, SERP, competitors, or topic.",
    "- Do not invent metrics, data sources, monitoring coverage, guarantees, awards, or superlatives.",
    "- If a product-specific statement is not verified, omit it.",
  ]
    .filter(Boolean)
    .join("\n");
}
