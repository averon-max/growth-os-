/** Verbatim source-registry extraction: discovery URLs are NOT verified evidence. */
import type { ProductionMasterLiveSourceResearch } from "./production-master-live-source-adapter";
import type { ProductionMasterArtifactPipelineInput } from "./production-master-artifact-builders";
import { defaultAuthorityTier, type EvidenceSourceType } from "./evidence-graph";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function buildEvidenceFromLiveResearch(
  research:
    Readonly<
      ProductionMasterLiveSourceResearch
    >
): ProductionMasterArtifactPipelineInput[
  "evidenceGraph"
] {
  /*
   * LIVE_EVIDENCE_SOURCE_BRIDGE_V2
   *
   * DISCOVERY != VERIFICATION.
   *
   * Real URLs observed through:
   * - verified first-party business facts
   * - live organic SERP
   * - live AI Overview references
   *
   * may enter the Evidence Graph source registry.
   *
   * SERP descriptions/snippets are intentionally NOT promoted
   * to VERIFIED_EXCERPT claim evidence.
   */

  const sources:
    ProductionMasterArtifactPipelineInput[
      "evidenceGraph"
    ]["sources"] =
      [];

  const claimEvidence:
    ProductionMasterArtifactPipelineInput[
      "evidenceGraph"
    ]["claimEvidence"] =
      [];

  const seenUrls =
    new Set<string>();


  function normalizedUrl(
    raw:
      string |
      null |
      undefined
  ): string | null {
    if (
      typeof raw !==
        "string" ||
      !raw.trim()
    ) {
      return null;
    }

    try {
      const parsed =
        new URL(
          raw.trim()
        );

      if (
        parsed.protocol !==
          "https:" &&
        parsed.protocol !==
          "http:"
      ) {
        return null;
      }

      parsed.hash = "";

      return parsed.toString();
    } catch {
      return null;
    }
  }


  function domainFromUrl(
    url:
      string
  ): string {
    try {
      return new URL(
        url
      )
        .hostname
        .toLowerCase()
        .replace(
          /^www\./,
          ""
        );
    } catch {
      return "";
    }
  }


  function sourceTypeForDomain(
    domain:
      string
  ): EvidenceSourceType {
    if (
      domain.endsWith(
        ".gov"
      )
    ) {
      return "PRIMARY_GOVERNMENT";
    }

    if (
      domain.endsWith(
        ".edu"
      )
    ) {
      return "ACADEMIC";
    }

    return "REPUTABLE_SECONDARY";
  }


  function addSource({
    id,
    rawUrl,
    publisher,
    forcedType,
  }: {
    id:
      string;

    rawUrl:
      string |
      null |
      undefined;

    publisher:
      string |
      null |
      undefined;

    forcedType?:
      EvidenceSourceType;
  }): void {
    const url =
      normalizedUrl(
        rawUrl
      );

    if (
      !url ||
      seenUrls.has(
        url
      )
    ) {
      return;
    }

    seenUrls.add(
      url
    );

    const domain =
      domainFromUrl(
        url
      );

    const sourceType =
      forcedType ??
      sourceTypeForDomain(
        domain
      );

    sources.push({
      id,

      url,

      publisher:
        publisher
          ?.trim() ||
        domain ||
        "Observed source",

      sourceType,

      authorityTier:
        defaultAuthorityTier(
          sourceType
        ),

      retrievedAt:
        new Date(
          research.capturedAt
        ),
    });
  }


  const verifiedClaims =
    Array.isArray(
      (
        research
          .businessFacts as
          unknown as {
            verifiedClaims?:
              unknown[];
          }
      ).verifiedClaims
    )
      ? (
          research
            .businessFacts as
            unknown as {
              verifiedClaims:
                unknown[];
            }
        ).verifiedClaims
      : [];


  verifiedClaims.forEach(
    (
      raw,
      index
    ) => {
      const record =
        asRecord(
          raw
        );

      if (
        !record
      ) {
        return;
      }

      const rawUrl =
        typeof record.url ===
          "string"
          ? record.url
          : typeof record.sourceUrl ===
              "string"
            ? record.sourceUrl
            : null;

      addSource({
        id:
          `business-fact-source-${index}`,

        rawUrl,

        publisher:
          typeof record.publisher ===
            "string"
            ? record.publisher
            : "Verified business fact",

        forcedType:
          "PRIMARY_OFFICIAL",
      });
    }
  );


  research
    .serpIntelligence
    .aiOverview
    .references
    .forEach(
      (
        reference,
        index
      ) => {
        addSource({
          id:
            `ai-overview-source-${index}`,

          rawUrl:
            reference.url,

          publisher:
            reference.domain ??
            reference.title,
        });
      }
    );


  research
    .serpIntelligence
    .organic
    .slice(
      0,
      10
    )
    .forEach(
      (
        result,
        index
      ) => {
        addSource({
          id:
            `organic-serp-source-${index}`,

          rawUrl:
            result.url,

          publisher:
            result.domain ||
            result.title,
        });
      }
    );


  return {
    sources,

    /*
     * Critical safety boundary:
     * observed URLs/snippets are discovery evidence only.
     *
     * Claim verification must later produce real
     * VERIFIED_EXCERPT records.
     */
    claimEvidence,
  };
}
