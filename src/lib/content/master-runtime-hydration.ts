import type {
  SearchMission,
} from "./search-mission";

import type {
  SerpSnapshot,
} from "./serp-observatory";

import type {
  EvidenceGraph,
  EvidenceSource,
} from "./evidence-graph";


export interface HydratedMasterRuntimeDates {
  mission:
    Readonly<SearchMission>;

  serpResearch:
    Readonly<SerpSnapshot> | null;

  evidenceGraph:
    Readonly<EvidenceGraph>;
}


function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value
    )
  );
}


function requiredDate(
  value: unknown,
  code: string
): Date {
  if (
    value instanceof
    Date
  ) {
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

  if (
    typeof value !==
    "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      code
    );
  }

  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      code
    );
  }

  return parsed;
}


function optionalDate(
  value: unknown,
  code: string
): Date | undefined {
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return undefined;
  }

  return requiredDate(
    value,
    code
  );
}


export function hydrateMasterRuntimeDates({
  mission,
  serpResearch,
  evidenceGraph,
}: {
  mission:
    unknown;

  serpResearch:
    unknown;

  evidenceGraph:
    unknown;
}): Readonly<HydratedMasterRuntimeDates> {
  if (
    !isRecord(
      mission
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_MISSION_DATE_INVALID"
    );
  }

  const createdAt =
    requiredDate(
      mission.createdAt,
      "MASTER_RUNTIME_MISSION_DATE_INVALID"
    );

  const hydratedMission =
    Object.freeze({
      ...mission,

      createdAt,
    }) as unknown as
      Readonly<SearchMission>;


  let hydratedSerp:
    Readonly<SerpSnapshot> |
    null =
      null;

  if (
    serpResearch !==
      null
  ) {
    if (
      !isRecord(
        serpResearch
      )
    ) {
      throw new Error(
        "MASTER_RUNTIME_SERP_DATE_INVALID"
      );
    }

    const capturedAt =
      requiredDate(
        serpResearch.capturedAt,
        "MASTER_RUNTIME_SERP_DATE_INVALID"
      );

    hydratedSerp =
      Object.freeze({
        ...serpResearch,

        capturedAt,
      }) as unknown as
        Readonly<SerpSnapshot>;
  }


  if (
    !isRecord(
      evidenceGraph
    ) ||
    !Array.isArray(
      evidenceGraph.sources
    ) ||
    !Array.isArray(
      evidenceGraph.claimEvidence
    )
  ) {
    throw new Error(
      "MASTER_RUNTIME_EVIDENCE_DATES_INVALID"
    );
  }

  const hydratedSources:
    Readonly<EvidenceSource>[] =
      evidenceGraph.sources.map(
        (source) => {
          if (
            !isRecord(
              source
            )
          ) {
            throw new Error(
              "MASTER_RUNTIME_EVIDENCE_DATES_INVALID"
            );
          }

          const retrievedAt =
            requiredDate(
              source.retrievedAt,
              "MASTER_RUNTIME_EVIDENCE_RETRIEVED_AT_INVALID"
            );

          const publishedAt =
            optionalDate(
              source.publishedAt,
              "MASTER_RUNTIME_EVIDENCE_PUBLISHED_AT_INVALID"
            );

          const updatedAt =
            optionalDate(
              source.updatedAt,
              "MASTER_RUNTIME_EVIDENCE_UPDATED_AT_INVALID"
            );

          return Object.freeze({
            ...source,

            publishedAt,

            updatedAt,

            retrievedAt,
          }) as unknown as
            Readonly<EvidenceSource>;
        }
      );

  const hydratedEvidenceGraph =
    Object.freeze({
      ...evidenceGraph,

      sources:
        Object.freeze(
          hydratedSources
        ),

      claimEvidence:
        Object.freeze([
          ...evidenceGraph
            .claimEvidence,
        ]),
    }) as unknown as
      Readonly<EvidenceGraph>;

  return Object.freeze({
    mission:
      hydratedMission,

    serpResearch:
      hydratedSerp,

    evidenceGraph:
      hydratedEvidenceGraph,
  });
}
