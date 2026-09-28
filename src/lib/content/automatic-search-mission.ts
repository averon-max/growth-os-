import type {
  ExplicitSearchMissionInput,
} from "./search-mission-ingress";


export interface AutomaticSearchMissionInput {
  topic:
    string;

  industry?:
    string | null;

  businessLocation?:
    string | null;

  env?:
    Record<
      string,
      string | undefined
    >;
}


const STOP_WORDS =
  new Set([
    "a",
    "an",
    "and",
    "for",
    "how",
    "in",
    "is",
    "of",
    "on",
    "the",
    "to",
    "what",
    "with",
  ]);


function clean(
  value:
    string |
    null |
    undefined
): string {
  return (
    value
      ?.trim() ??
    ""
  );
}


function tokens(
  value:
    string
): readonly string[] {
  return Object.freeze(
    value
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        " "
      )
      .split(
        /\s+/
      )
      .map(
        (token) =>
          token.trim()
      )
      .filter(
        (token) =>
          token.length >
            2 &&
          !STOP_WORDS.has(
            token
          )
      )
  );
}


function containsAny(
  value:
    string,
  terms:
    readonly string[]
): boolean {
  return terms.some(
    (term) =>
      value.includes(
        term
      )
  );
}


function inferBusinessRelationship({
  topic,
  industry,
}: {
  topic:
    string;

  industry:
    string;
}):
  ExplicitSearchMissionInput[
    "businessRelationship"
  ] {
  if (
    !industry
  ) {
    return "ADJACENT";
  }

  const topicTokens =
    new Set(
      tokens(
        topic
      )
    );

  const overlaps =
    tokens(
      industry
    ).filter(
      (token) =>
        topicTokens.has(
          token
        )
    );

  return overlaps.length >
    0
    ? "DIRECT"
    : "ADJACENT";
}


function inferRiskClass({
  topic,
  industry,
}: {
  topic:
    string;

  industry:
    string;
}):
  ExplicitSearchMissionInput[
    "riskClass"
  ] {
  const context =
    `${topic} ${industry}`
      .toLowerCase();

  if (
    containsAny(
      context,
      [
        "credit",
        "finance",
        "financial",
        "bank",
        "banking",
        "loan",
        "mortgage",
        "debt",
        "investment",
        "investing",
        "insurance",
        "tax",
      ]
    )
  ) {
    return "YMYL_FINANCE";
  }

  if (
    containsAny(
      context,
      [
        "health",
        "medical",
        "medicine",
        "disease",
        "symptom",
        "treatment",
        "therapy",
      ]
    )
  ) {
    return "YMYL_HEALTH";
  }

  if (
    containsAny(
      context,
      [
        "legal",
        "law",
        "lawsuit",
        "attorney",
        "lawyer",
        "regulation",
      ]
    )
  ) {
    return "YMYL_LEGAL";
  }

  if (
    containsAny(
      context,
      [
        "identity theft",
        "fraud",
        "security",
        "cybersecurity",
        "data breach",
        "scam",
        "safety",
      ]
    )
  ) {
    return "YMYL_SAFETY";
  }

  return "NORMAL";
}


function inferJurisdiction(
  location:
    string,
  configured:
    string
): string | undefined {
  if (
    configured
  ) {
    return configured;
  }

  if (
    /united states|new york|california|texas|florida|usa|\bus\b/i.test(
      location
    )
  ) {
    return "US";
  }

  if (
    /canada|alberta|ontario|british columbia|quebec/i.test(
      location
    )
  ) {
    return "CA";
  }

  return undefined;
}


export function resolveAutomaticSearchMission({
  topic,
  industry,
  businessLocation,
  env =
    process.env,
}: AutomaticSearchMissionInput):
  ExplicitSearchMissionInput {
  const cleanTopic =
    clean(
      topic
    );

  if (
    !cleanTopic
  ) {
    throw new Error(
      "AUTO_SEARCH_MISSION_TOPIC_REQUIRED"
    );
  }

  const cleanIndustry =
    clean(
      industry
    );

  const configuredLocation =
    clean(
      env.CONTENT_DEFAULT_LOCATION
    );

  const configuredJurisdiction =
    clean(
      env.CONTENT_DEFAULT_JURISDICTION
    );

  const configuredLanguage =
    clean(
      env.CONTENT_DEFAULT_LANGUAGE
    );

  const location =
    configuredLocation ||
    clean(
      businessLocation
    ) ||
    "United States";

  const language =
    configuredLanguage ||
    "en";

  const jurisdiction =
    inferJurisdiction(
      location,
      configuredJurisdiction
    );

  const businessRelationship =
    inferBusinessRelationship({
      topic:
        cleanTopic,

      industry:
        cleanIndustry,
    });

  const riskClass =
    inferRiskClass({
      topic:
        cleanTopic,

      industry:
        cleanIndustry,
    });

  const audience =
    cleanIndustry
      ? `People researching ${cleanTopic} who need trustworthy information relevant to ${cleanIndustry}.`
      : `People researching ${cleanTopic} who need a clear and trustworthy answer.`;

  const readerGoal =
    `Understand ${cleanTopic}, how it works, its important limitations and tradeoffs, and what action to take next.`;

  return Object.freeze({
    audience,

    readerGoal,

    businessRelationship,

    jurisdiction,

    language,

    location,

    riskClass,
  });
}
