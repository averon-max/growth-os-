import type {
  OriginalValueAsset,
} from "./original-value";


export type MediaRequirementTypeV1 =
  | "DIAGRAM"
  | "SCREENSHOT"
  | "CHART";


export type MediaRequirementStatusV1 =
  | "READY"
  | "REQUIRES_VERIFICATION";


export interface MediaRequirementV1 {
  readonly version:
    "MEDIA_REQUIREMENT_V1";

  readonly id:
    string;

  readonly sectionId:
    string;

  readonly assetId:
    string;

  readonly type:
    MediaRequirementTypeV1;

  readonly purpose:
    string;

  readonly evidenceIds:
    readonly string[];

  /*
   * READY:
   * upstream OriginalValueAsset is verified.
   *
   * REQUIRES_VERIFICATION:
   * this is only a planned media requirement.
   * Writer MUST NOT represent it as an existing real asset.
   */
  readonly status:
    MediaRequirementStatusV1;
}


function uniqueStrings(
  values:
    readonly string[]
): readonly string[] {
  return Object.freeze([
    ...new Set(
      values
        .map(
          (
            value
          ) =>
            value.trim()
        )
        .filter(Boolean)
    ),
  ]);
}


function requiredText(
  value:
    unknown,
  code:
    string
): string {
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

  return value.trim();
}


function record(
  value:
    unknown
): Record<
  string,
  unknown
> | null {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return null;
  }

  return value as
    Record<
      string,
      unknown
    >;
}


function mapAssetToMediaTypeV1(
  asset:
    Readonly<OriginalValueAsset>
): MediaRequirementTypeV1 | null {
  switch (
    asset.type
  ) {
    case "ORIGINAL_DIAGRAM":
      return "DIAGRAM";

    case "REAL_SCREENSHOTS":
      return "SCREENSHOT";

    /*
     * A chart necessarily represents data.
     *
     * Never create a CHART requirement from an unverified
     * dataset/research/telemetry asset.
     */
    case "FIRST_PARTY_DATASET":
    case "ORIGINAL_RESEARCH":
    case "FIRST_PARTY_TELEMETRY":
      return asset.verified
        ? "CHART"
        : null;

    default:
      return null;
  }
}


export function buildMediaRequirementsForAssignedAssetV1({
  sectionId,
  asset,
}: {
  readonly sectionId:
    string;

  readonly asset:
    Readonly<OriginalValueAsset>;
}): readonly Readonly<MediaRequirementV1>[] {
  const cleanSectionId =
    sectionId.trim();

  if (!cleanSectionId) {
    throw new Error(
      "MEDIA_REQUIREMENT_SECTION_ID_REQUIRED"
    );
  }


  const mediaType =
    mapAssetToMediaTypeV1(
      asset
    );

  if (!mediaType) {
    return Object.freeze(
      []
    );
  }


  const purpose =
    asset.description
      .trim() ||
    asset.title
      .trim();


  if (!purpose) {
    throw new Error(
      "MEDIA_REQUIREMENT_PURPOSE_REQUIRED"
    );
  }


  const requirement:
    MediaRequirementV1 =
      Object.freeze({
        version:
          "MEDIA_REQUIREMENT_V1",

        id:
          `media:${cleanSectionId}:${asset.id}:${mediaType}`,

        sectionId:
          cleanSectionId,

        assetId:
          asset.id,

        type:
          mediaType,

        purpose,

        evidenceIds:
          uniqueStrings(
            asset.evidenceIds ??
            []
          ),

        status:
          asset.verified
            ? "READY"
            : "REQUIRES_VERIFICATION",
      });


  return Object.freeze([
    requirement,
  ]);
}


export function isMediaRequirementReadyV1(
  requirement:
    Readonly<MediaRequirementV1>
): boolean {
  return (
    requirement.status ===
    "READY"
  );
}


export function parseMediaRequirementsV1(
  value:
    unknown
): readonly Readonly<MediaRequirementV1>[] {
  /*
   * Backward compatibility for pre-Pass-4B persisted plans.
   */
  if (
    value ===
      undefined ||
    value ===
      null
  ) {
    return Object.freeze(
      []
    );
  }


  if (
    !Array.isArray(
      value
    )
  ) {
    throw new Error(
      "MEDIA_REQUIREMENTS_PERSISTED_INVALID"
    );
  }


  const seenIds =
    new Set<string>();


  const parsed =
    value.map(
      (
        raw,
        index
      ): Readonly<MediaRequirementV1> => {
        const source =
          record(
            raw
          );

        if (!source) {
          throw new Error(
            `MEDIA_REQUIREMENT_PERSISTED_ITEM_INVALID:${index}`
          );
        }


        if (
          source.version !==
          "MEDIA_REQUIREMENT_V1"
        ) {
          throw new Error(
            `MEDIA_REQUIREMENT_VERSION_INVALID:${index}`
          );
        }


        const id =
          requiredText(
            source.id,
            `MEDIA_REQUIREMENT_ID_INVALID:${index}`
          );


        if (
          seenIds.has(
            id
          )
        ) {
          throw new Error(
            `MEDIA_REQUIREMENT_ID_DUPLICATE:${id}`
          );
        }

        seenIds.add(
          id
        );


        const type =
          source.type;


        if (
          type !==
            "DIAGRAM" &&
          type !==
            "SCREENSHOT" &&
          type !==
            "CHART"
        ) {
          throw new Error(
            `MEDIA_REQUIREMENT_TYPE_INVALID:${index}`
          );
        }


        const status =
          source.status;


        if (
          status !==
            "READY" &&
          status !==
            "REQUIRES_VERIFICATION"
        ) {
          throw new Error(
            `MEDIA_REQUIREMENT_STATUS_INVALID:${index}`
          );
        }


        const evidenceRaw =
          source.evidenceIds;


        if (
          !Array.isArray(
            evidenceRaw
          ) ||
          !evidenceRaw.every(
            (
              item
            ): item is string =>
              typeof item ===
                "string"
          )
        ) {
          throw new Error(
            `MEDIA_REQUIREMENT_EVIDENCE_INVALID:${index}`
          );
        }


        return Object.freeze({
          version:
            "MEDIA_REQUIREMENT_V1",

          id,

          sectionId:
            requiredText(
              source.sectionId,
              `MEDIA_REQUIREMENT_SECTION_INVALID:${index}`
            ),

          assetId:
            requiredText(
              source.assetId,
              `MEDIA_REQUIREMENT_ASSET_INVALID:${index}`
            ),

          type,

          purpose:
            requiredText(
              source.purpose,
              `MEDIA_REQUIREMENT_PURPOSE_INVALID:${index}`
            ),

          evidenceIds:
            uniqueStrings(
              evidenceRaw
            ),

          status,
        });
      }
    );


  return Object.freeze(
    parsed
  );
}
