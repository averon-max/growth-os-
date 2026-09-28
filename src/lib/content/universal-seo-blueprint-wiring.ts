import type {
  UniversalPageArchetype,
} from "./universal-page-archetype";

import type {
  UniversalSeoDecisionV2,
} from "./universal-seo-decision";


export type ExistingMasterSearchAction =
  | "CREATE"
  | "UPDATE"
  | "MERGE"
  | "SPLIT"
  | "REPOSITION"
  | "NO_GO";


interface MasterBlueprintLike {
  action:
    ExistingMasterSearchAction;

  targetUrl?:
    string;

  pageType:
    string;

  technicalRequirements?:
    string[];
}


interface SectionLike {
  heading:
    string;

  mission:
    string;

  expectedOutcome:
    string;
}


interface SectionInputLike {
  sections:
    SectionLike[];
}


function unique(
  values:
    readonly string[]
): string[] {
  const seen =
    new Set<string>();

  const result:
    string[] =
      [];

  for (
    const raw
    of values
  ) {
    const value =
      raw.trim();

    if (
      !value
    ) {
      continue;
    }

    const key =
      value
        .toLowerCase();

    if (
      seen.has(
        key
      )
    ) {
      continue;
    }

    seen.add(
      key
    );

    result.push(
      value
    );
  }

  return result;
}


function existingAction(
  decision:
    Readonly<
      UniversalSeoDecisionV2
    >
): ExistingMasterSearchAction {
  switch (
    decision
      .recommendedAction
  ) {
    case "UPDATE":
      return "UPDATE";

    case "MERGE":
      return "MERGE";

    case "REPOSITION":
      return "REPOSITION";

    case "REVIEW":
      /*
       * REVIEW means evidence is not strong enough to safely
       * create another URL.
       *
       * Existing Master Runtime already understands NO_GO as
       * persistable research + writer blocker.
       */
      return "NO_GO";

    case "KEEP_BOTH":
    case "CREATE":
    default:
      return "CREATE";
  }
}


function targetUrl(
  decision:
    Readonly<
      UniversalSeoDecisionV2
    >
): string | undefined {
  const action =
    existingAction(
      decision
    );

  if (
    action !==
      "UPDATE" &&
    action !==
      "MERGE" &&
    action !==
      "REPOSITION"
  ) {
    return undefined;
  }

  return (
    decision
      .cannibalization
      .primaryOwnerUrl ??
    undefined
  );
}


export function archetypeWritingDirectiveV2(
  archetype:
    UniversalPageArchetype
): string {
  switch (
    archetype
  ) {
    case "DEFINITION":
      return [
        "Answer the definition immediately.",
        "Then explain scope, mechanism, limitations, and the reader's next decision.",
        "Do not pad the page with unrelated history or generic filler.",
      ].join(
        " "
      );

    case "EXPLAINER":
      return [
        "Lead with the direct answer.",
        "Explain how the subject works, why it matters, limitations, edge cases, and practical next actions.",
      ].join(
        " "
      );

    case "HOW_TO":
    case "TUTORIAL":
      return [
        "Use task-first structure.",
        "State prerequisites when relevant.",
        "Give ordered executable steps.",
        "Include warnings, validation, and troubleshooting only where the evidence or task requires them.",
      ].join(
        " "
      );

    case "TROUBLESHOOTING":
      return [
        "Organize around symptom, likely cause, diagnosis, fix, and verification.",
        "Prefer the shortest safe diagnostic path before destructive actions.",
      ].join(
        " "
      );

    case "COMPARISON":
      return [
        "Define comparison criteria before conclusions.",
        "Compare alternatives consistently.",
        "Explain tradeoffs and who each option fits.",
        "Do not manufacture a winner without supporting evidence.",
      ].join(
        " "
      );

    case "BEST_OF":
    case "BUYING_GUIDE":
      return [
        "Explain selection criteria and methodology.",
        "Organize recommendations by real user use case.",
        "Show meaningful tradeoffs.",
        "Never claim hands-on testing unless first-party testing evidence exists.",
      ].join(
        " "
      );

    case "PRODUCT_REVIEW":
      return [
        "Separate verified product facts from evaluation.",
        "State methodology or evidence basis.",
        "Cover strengths, limitations, fit, and alternatives.",
        "Never imply first-party testing that did not occur.",
      ].join(
        " "
      );

    case "B2B_CATEGORY":
      return [
        "Structure around buyer jobs, evaluation criteria, use cases, tradeoffs, and category fit.",
        "Do not turn the page into a generic list of vendors.",
      ].join(
        " "
      );

    case "CHECKLIST":
      return [
        "Make every checklist item independently actionable.",
        "Order items by dependency or execution sequence when one exists.",
      ].join(
        " "
      );

    case "CASE_STUDY":
      return [
        "Separate context, intervention, observed result, and limitations.",
        "Do not generalize beyond the supplied evidence.",
      ].join(
        " "
      );

    case "RESEARCH":
      return [
        "State data/source scope and methodology.",
        "Present findings before interpretation.",
        "Expose limitations and uncertainty.",
      ].join(
        " "
      );

    case "REFERENCE":
      return [
        "Optimize for precise retrieval.",
        "Use unambiguous definitions, parameters, constraints, and examples.",
        "Avoid editorial filler.",
      ].join(
        " "
      );

    case "LANDING_PAGE":
      return [
        "Satisfy the search intent before conversion copy.",
        "Use only verified product capabilities.",
        "Make the next action explicit without hiding limitations.",
      ].join(
        " "
      );

    case "PROGRAMMATIC_PAGE":
      return [
        "Keep template structure consistent while ensuring each page contains genuinely query-specific value.",
        "Never manufacture unique facts merely to differentiate pages.",
      ].join(
        " "
      );

    case "FRESH_QUERY":
      return [
        "Prioritize fresh primary sources and explicit dates.",
        "Separate confirmed developments from interpretation.",
        "Avoid stale evergreen claims when the query is freshness-sensitive.",
      ].join(
        " "
      );

    case "LIST":
      return [
        "Give every list item a distinct information job.",
        "Avoid arbitrary item counts and near-duplicate entries.",
      ].join(
        " "
      );

    case "GENERIC_ARTICLE":
    default:
      return [
        "Answer the search mission directly.",
        "Use one logical section per distinct user information job.",
        "Avoid filler and arbitrary heading counts.",
      ].join(
        " "
      );
  }
}


export function buildUniversalSeoWriterRulesV2(
  decision:
    Readonly<
      UniversalSeoDecisionV2
    >
): readonly string[] {
  return Object.freeze([
    "UNIVERSAL_SEO_V2",

    `PAGE_ARCHETYPE:${decision.archetype.archetype}`,

    `EVIDENCE_MODE:${decision.evidenceMode}`,

    `ORIGINAL_VALUE_STRATEGY:${decision.originalValueStrategy}`,

    `CANNIBALIZATION_MODE:${decision.cannibalization.mode}`,

    `CANNIBALIZATION_ACTION:${decision.recommendedAction}`,

    archetypeWritingDirectiveV2(
      decision
        .archetype
        .archetype
    ),

    decision.evidenceMode ===
      "STRICT_PRIMARY_SOURCES"
      ? "Material factual claims require primary or publication-grade assigned evidence; unsupported high-risk claims must be omitted."
      : "Material factual claims must remain grounded in assigned evidence; ordinary explanatory prose must not invent facts.",

    decision.originalValueStrategy ===
      "TESTING_OR_COMPARISON"
      ? "Do not fabricate first-party testing, measurements, rankings, or product experience."
      : "Original value must come from supported synthesis, real data, real process experience, or an assigned original-value asset.",
  ]);
}


export function applyUniversalSeoDecisionToMasterBlueprintV2<
  T extends
    MasterBlueprintLike
>({
  input,
  decision,
}: {
  input:
    T;

  decision:
    Readonly<
      UniversalSeoDecisionV2
    >;
}): Omit<
  T,
  | "action"
  | "pageType"
  | "technicalRequirements"
  | "targetUrl"
> & {
  action:
    ExistingMasterSearchAction;

  pageType:
    string;

  technicalRequirements:
    string[];

  targetUrl?:
    string;
} {
  const technicalRequirements =
    unique([
      ...(
        input
          .technicalRequirements ??
        []
      ),

      ...buildUniversalSeoWriterRulesV2(
        decision
      ),
    ]);


  const ownerUrl =
    targetUrl(
      decision
    );


  return {
    ...input,

    action:
      existingAction(
        decision
      ),

    pageType:
      decision
        .archetype
        .archetype,

    technicalRequirements,

    ...(
      ownerUrl
        ? {
            targetUrl:
              ownerUrl,
          }
        : {
            targetUrl:
              undefined,
          }
    ),
  } as Omit<
    T,
    | "action"
    | "pageType"
    | "technicalRequirements"
    | "targetUrl"
  > & {
    action:
      ExistingMasterSearchAction;

    pageType:
      string;

    technicalRequirements:
      string[];

    targetUrl?:
      string;
  };
}


export function applyUniversalSeoDecisionToSectionsV2<
  T extends
    SectionInputLike
>({
  input,
  decision,
}: {
  input:
    T;

  decision:
    Readonly<
      UniversalSeoDecisionV2
    >;
}): T {
  /*
   * An unresolved SMART ownership decision becomes NO_GO.
   * Existing SectionBlueprint correctly requires zero sections
   * for NO_GO, so the writer cannot accidentally publish.
   */
  if (
    decision
      .recommendedAction ===
      "REVIEW"
  ) {
    return {
      ...input,

      sections:
        [],
    } as T;
  }


  const directive =
    archetypeWritingDirectiveV2(
      decision
        .archetype
        .archetype
    );


  return {
    ...input,

    sections:
      input.sections.map(
        (
          section
        ) => ({
          ...section,

          mission:
            [
              section
                .mission
                .trim(),

              `Page archetype: ${decision.archetype.archetype}.`,

              directive,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              ),

          expectedOutcome:
            [
              section
                .expectedOutcome
                .trim(),

              `This section must satisfy its information job within the ${decision.archetype.archetype} page archetype.`,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              ),
        })
      ),
  } as T;
}
