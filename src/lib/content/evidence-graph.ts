export type EvidenceSourceType =
  | "PRIMARY_GOVERNMENT"
  | "PRIMARY_OFFICIAL"
  | "ACADEMIC"
  | "REPUTABLE_SECONDARY"
  | "COMPETITOR"
  | "UGC";


export type EvidenceAuthorityTier =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F";


export type ClaimEvidenceRelation =
  | "SUPPORTS"
  | "PARTIALLY_SUPPORTS"
  | "CONTRADICTS";


/*
 * Bridge to the already-existing Growth OS evidence policy.
 *
 * SEARCH_SNIPPET and REFERENCE_ONLY are discovery context.
 * VERIFIED_EXCERPT is publication-grade evidence.
 */
export type ClaimEvidenceKind =
  | "VERIFIED_EXCERPT"
  | "REFERENCE_ONLY"
  | "SEARCH_SNIPPET";


export interface EvidenceSource {
  id:
    string;

  url:
    string;

  publisher:
    string;

  sourceType:
    EvidenceSourceType;

  authorityTier:
    EvidenceAuthorityTier;

  jurisdiction?:
    string;

  publishedAt?:
    Date;

  updatedAt?:
    Date;

  retrievedAt:
    Date;
}


export interface ClaimEvidence {
  id:
    string;

  claimId:
    string;

  sourceId:
    string;

  relation:
    ClaimEvidenceRelation;

  kind:
    ClaimEvidenceKind;

  excerpt?:
    string;
}


export interface EvidenceGraph {
  version:
    "EVIDENCE_GRAPH_V1";

  sources:
    readonly Readonly<EvidenceSource>[];

  claimEvidence:
    readonly Readonly<ClaimEvidence>[];
}


export function defaultAuthorityTier(
  sourceType:
    EvidenceSourceType
): EvidenceAuthorityTier {
  switch (
    sourceType
  ) {
    case "PRIMARY_GOVERNMENT":
      return "A";

    case "PRIMARY_OFFICIAL":
      return "B";

    case "ACADEMIC":
      return "C";

    case "REPUTABLE_SECONDARY":
      return "C";

    case "COMPETITOR":
      return "E";

    case "UGC":
      return "F";
  }
}


function requiredText(
  value: string,
  code: string
): string {
  const clean =
    value.trim();

  if (
    !clean
  ) {
    throw new Error(
      code
    );
  }

  return clean;
}


function validDate(
  value:
    Date |
    undefined,

  code:
    string
): Date | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    throw new Error(
      code
    );
  }

  return new Date(
    value
  );
}


function validHttpUrl(
  value: string
): string {
  let parsed:
    URL;

  try {
    parsed =
      new URL(
        value
      );
  } catch {
    throw new Error(
      "EVIDENCE_SOURCE_URL_INVALID"
    );
  }

  if (
    parsed.protocol !==
      "https:" &&
    parsed.protocol !==
      "http:"
  ) {
    throw new Error(
      "EVIDENCE_SOURCE_URL_INVALID"
    );
  }

  parsed.hash =
    "";

  return parsed.toString();
}


export function isPublicationGradeClaimEvidence(
  evidence:
    Readonly<ClaimEvidence>
): boolean {
  return (
    evidence.kind ===
      "VERIFIED_EXCERPT" &&
    typeof evidence.excerpt ===
      "string" &&
    evidence.excerpt.trim()
      .length >
      0
  );
}


export function buildEvidenceGraph({
  sources,
  claimEvidence,
}: {
  sources:
    EvidenceSource[];

  claimEvidence:
    ClaimEvidence[];
}): Readonly<EvidenceGraph> {
  const sourceIds =
    new Set<string>();

  const frozenSources =
    sources.map(
      (source) => {
        const id =
          requiredText(
            source.id,
            "EVIDENCE_SOURCE_ID_REQUIRED"
          );

        if (
          sourceIds.has(
            id
          )
        ) {
          throw new Error(
            "EVIDENCE_SOURCE_DUPLICATE_ID"
          );
        }

        sourceIds.add(
          id
        );

        const retrievedAt =
          validDate(
            source.retrievedAt,
            "EVIDENCE_SOURCE_RETRIEVED_AT_INVALID"
          );

        if (
          !retrievedAt
        ) {
          throw new Error(
            "EVIDENCE_SOURCE_RETRIEVED_AT_REQUIRED"
          );
        }

        return Object.freeze({
          ...source,

          id,

          url:
            validHttpUrl(
              source.url
            ),

          publisher:
            requiredText(
              source.publisher,
              "EVIDENCE_SOURCE_PUBLISHER_REQUIRED"
            ),

          jurisdiction:
            source.jurisdiction
              ?.trim() ||
            undefined,

          publishedAt:
            validDate(
              source.publishedAt,
              "EVIDENCE_SOURCE_PUBLISHED_AT_INVALID"
            ),

          updatedAt:
            validDate(
              source.updatedAt,
              "EVIDENCE_SOURCE_UPDATED_AT_INVALID"
            ),

          retrievedAt,
        });
      }
    );

  const evidenceIds =
    new Set<string>();

  const frozenEvidence =
    claimEvidence.map(
      (evidence) => {
        const id =
          requiredText(
            evidence.id,
            "CLAIM_EVIDENCE_ID_REQUIRED"
          );

        if (
          evidenceIds.has(
            id
          )
        ) {
          throw new Error(
            "CLAIM_EVIDENCE_DUPLICATE_ID"
          );
        }

        evidenceIds.add(
          id
        );

        const claimId =
          requiredText(
            evidence.claimId,
            "CLAIM_EVIDENCE_CLAIM_ID_REQUIRED"
          );

        const sourceId =
          requiredText(
            evidence.sourceId,
            "CLAIM_EVIDENCE_SOURCE_ID_REQUIRED"
          );

        if (
          !sourceIds.has(
            sourceId
          )
        ) {
          throw new Error(
            "CLAIM_EVIDENCE_SOURCE_NOT_FOUND"
          );
        }

        const excerpt =
          evidence.excerpt
            ?.trim() ||
          undefined;

        if (
          evidence.kind ===
            "VERIFIED_EXCERPT" &&
          !excerpt
        ) {
          throw new Error(
            "VERIFIED_EXCERPT_TEXT_REQUIRED"
          );
        }

        return Object.freeze({
          ...evidence,

          id,

          claimId,

          sourceId,

          excerpt,
        });
      }
    );

  return Object.freeze({
    version:
      "EVIDENCE_GRAPH_V1" as const,

    sources:
      Object.freeze(
        frozenSources
      ),

    claimEvidence:
      Object.freeze(
        frozenEvidence
      ),
  });
}


export function evidenceForClaim({
  graph,
  claimId,
}: {
  graph:
    Readonly<EvidenceGraph>;

  claimId:
    string;
}): readonly Readonly<ClaimEvidence>[] {
  return graph.claimEvidence.filter(
    (evidence) =>
      evidence.claimId ===
      claimId
  );
}


export function sourceForEvidence({
  graph,
  evidence,
}: {
  graph:
    Readonly<EvidenceGraph>;

  evidence:
    Readonly<ClaimEvidence>;
}): Readonly<EvidenceSource> | null {
  return (
    graph.sources.find(
      (source) =>
        source.id ===
        evidence.sourceId
    ) ??
    null
  );
}
