import {
  randomUUID,
} from "node:crypto";


export type SearchRiskClass =
  | "NORMAL"
  | "YMYL_FINANCE"
  | "YMYL_HEALTH"
  | "YMYL_SAFETY"
  | "YMYL_LEGAL"
  | "OTHER_SENSITIVE";


export type SearchBusinessRelationship =
  | "CORE"
  | "DIRECT"
  | "ADJACENT"
  | "WEAK";


export interface SearchMission {
  id:
    string;

  websiteId:
    string;

  topic:
    string;

  audience:
    string;

  readerGoal:
    string;

  businessRelationship:
    SearchBusinessRelationship;

  jurisdiction?:
    string;

  language:
    string;

  location:
    string;

  riskClass:
    SearchRiskClass;

  createdAt:
    Date;

  version:
    number;
}


export interface CreateSearchMissionInput {
  id?:
    string;

  websiteId:
    string;

  topic:
    string;

  audience:
    string;

  readerGoal:
    string;

  businessRelationship:
    SearchBusinessRelationship;

  jurisdiction?:
    string;

  language:
    string;

  location:
    string;

  riskClass:
    SearchRiskClass;

  createdAt?:
    Date;

  version?:
    number;
}


function requiredText({
  value,
  field,
}: {
  value: string;
  field: string;
}): string {
  const normalized =
    value.trim();

  if (
    normalized.length ===
    0
  ) {
    throw new Error(
      `SEARCH_MISSION_${field}_REQUIRED`
    );
  }

  return normalized;
}


function optionalText(
  value:
    string |
    undefined
): string | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  const normalized =
    value.trim();

  return (
    normalized.length >
    0
      ? normalized
      : undefined
  );
}


function validVersion(
  value:
    number |
    undefined
): number {
  const version =
    value ??
    1;

  if (
    !Number.isInteger(
      version
    ) ||
    version <
      1
  ) {
    throw new Error(
      "SEARCH_MISSION_VERSION_INVALID"
    );
  }

  return version;
}


export function createSearchMission(
  input:
    CreateSearchMissionInput
): Readonly<SearchMission> {
  const mission: SearchMission = {
    id:
      optionalText(
        input.id
      ) ??
      randomUUID(),

    websiteId:
      requiredText({
        value:
          input.websiteId,

        field:
          "WEBSITE_ID",
      }),

    topic:
      requiredText({
        value:
          input.topic,

        field:
          "TOPIC",
      }),

    audience:
      requiredText({
        value:
          input.audience,

        field:
          "AUDIENCE",
      }),

    readerGoal:
      requiredText({
        value:
          input.readerGoal,

        field:
          "READER_GOAL",
      }),

    businessRelationship:
      input.businessRelationship,

    jurisdiction:
      optionalText(
        input.jurisdiction
      ),

    language:
      requiredText({
        value:
          input.language,

        field:
          "LANGUAGE",
      }),

    location:
      requiredText({
        value:
          input.location,

        field:
          "LOCATION",
      }),

    riskClass:
      input.riskClass,

    createdAt:
      input.createdAt
        ? new Date(
            input.createdAt
          )
        : new Date(),

    version:
      validVersion(
        input.version
      ),
  };

  /*
   * SearchMission is the immutable zero-layer research contract.
   *
   * Keyword demand, SERP data, volume, KD, competitors,
   * topical authority and AI output are NOT allowed to mutate it.
   *
   * A changed mission must create a new mission version.
   */
  return Object.freeze(
    mission
  );
}


export function reviseSearchMission({
  previous,
  changes,
  id,
  createdAt,
}: {
  previous:
    Readonly<SearchMission>;

  changes:
    Partial<
      Omit<
        CreateSearchMissionInput,
        | "id"
        | "websiteId"
        | "version"
        | "createdAt"
      >
    >;

  id?:
    string;

  createdAt?:
    Date;
}): Readonly<SearchMission> {
  return createSearchMission({
    id,

    websiteId:
      previous.websiteId,

    topic:
      changes.topic ??
      previous.topic,

    audience:
      changes.audience ??
      previous.audience,

    readerGoal:
      changes.readerGoal ??
      previous.readerGoal,

    businessRelationship:
      changes.businessRelationship ??
      previous.businessRelationship,

    jurisdiction:
      changes.jurisdiction ??
      previous.jurisdiction,

    language:
      changes.language ??
      previous.language,

    location:
      changes.location ??
      previous.location,

    riskClass:
      changes.riskClass ??
      previous.riskClass,

    createdAt,

    version:
      previous.version +
      1,
  });
}
