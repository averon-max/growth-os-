import {
  buildProductionMasterArtifacts,
  type ProductionMasterArtifactPipelineInput,
} from "./production-master-artifact-builders";


export type ProductionMasterSourceKind =
  | "USER_EXPLICIT"
  | "GSC"
  | "PERSISTED_KEYWORD_METRICS"
  | "DATAFORSEO"
  | "LIVE_SERP"
  | "SITE_CRAWL"
  | "VERIFIED_BUSINESS_FACT"
  | "VERIFIED_EXTERNAL_EVIDENCE"
  | "DETERMINISTIC_DERIVATION";


export type ProductionMasterSourceStage =
  | "SEARCH_MISSION"
  | "QUERY_GRAPH"
  | "SERP_RESEARCH"
  | "EXPECTED_COVERAGE"
  | "GAP_ANALYSIS"
  | "ORIGINAL_VALUE"
  | "EVIDENCE_GRAPH"
  | "CLAIM_LEDGER"
  | "MASTER_BLUEPRINT"
  | "SECTION_BLUEPRINTS";


export interface ProductionMasterSourceRecord {
  stage:
    ProductionMasterSourceStage;

  source:
    ProductionMasterSourceKind;

  /*
   * Stable non-secret identifier or description.
   *
   * Examples:
   * - GSC property id
   * - DataForSEO task / endpoint class
   * - SERP snapshot fingerprint
   * - persisted BusinessFact id
   * - external evidence source URL
   *
   * Never put credentials here.
   */
  ref:
    string;
}


export interface ProductionMasterSourceBundle {
  input:
    ProductionMasterArtifactPipelineInput;

  provenance:
    readonly Readonly<
      ProductionMasterSourceRecord
    >[];
}


export class ProductionMasterSourceBlockedError
  extends Error {
  readonly code =
    "PRODUCTION_MASTER_SOURCE_BLOCKED";

  readonly blockers:
    readonly string[];


  constructor(
    blockers:
      readonly string[]
  ) {
    const normalized =
      Object.freeze([
        ...new Set(
          blockers
        ),
      ]);


    super(
      `Production Master source assembly blocked: ${normalized.join(", ")}`
    );


    this.name =
      "ProductionMasterSourceBlockedError";

    this.blockers =
      normalized;
  }
}


function nonEmpty(
  value:
    unknown
): boolean {
  return (
    typeof value ===
      "string" &&
    value.trim().length >
      0
  );
}


function hasStageProvenance(
  provenance:
    readonly Readonly<
      ProductionMasterSourceRecord
    >[],
  stage:
    ProductionMasterSourceStage
): boolean {
  return provenance.some(
    (item) =>
      item.stage ===
        stage &&
      nonEmpty(
        item.ref
      )
  );
}


export function inspectProductionMasterSourceBundle(
  bundle:
    ProductionMasterSourceBundle
): Readonly<{
  ready:
    boolean;

  blockers:
    readonly string[];
}> {
  const blockers:
    string[] =
      [];


  const {
    input,
    provenance,
  } =
    bundle;


  /*
   * Stage 1:
   * semantic mission must be explicit.
   *
   * createSearchMission() performs the complete contract
   * validation later; these checks prevent a source bundle
   * from pretending that missing mission semantics exist.
   */
  if (
    !nonEmpty(
      input.mission.websiteId
    )
  ) {
    blockers.push(
      "SOURCE_MISSION_WEBSITE_ID_MISSING"
    );
  }


  if (
    !nonEmpty(
      input.mission.topic
    )
  ) {
    blockers.push(
      "SOURCE_MISSION_TOPIC_MISSING"
    );
  }


  if (
    !nonEmpty(
      input.mission.audience
    )
  ) {
    blockers.push(
      "SOURCE_MISSION_AUDIENCE_MISSING"
    );
  }


  if (
    !nonEmpty(
      input.mission.readerGoal
    )
  ) {
    blockers.push(
      "SOURCE_MISSION_READER_GOAL_MISSING"
    );
  }


  /*
   * Stage 2:
   * no synthetic keyword graph.
   *
   * A production run needs at least one actual upstream
   * query signal. Missing metrics on a real signal remain
   * missing — we never replace them with zero.
   */
  if (
    input.queryGraph
      .signals.length ===
    0
  ) {
    blockers.push(
      "SOURCE_QUERY_SIGNALS_MISSING"
    );
  }


  /*
   * Stage 4:
   * production article creation requires an observed SERP.
   *
   * MasterRuntime itself can represent serpResearch=null for
   * historical/audit purposes, but the live article creation
   * ingress is intentionally stricter.
   */
  if (
    input.serpResearch ===
    null
  ) {
    blockers.push(
      "SOURCE_LIVE_SERP_MISSING"
    );
  } else if (
    input.serpResearch
      .results.length ===
    0
  ) {
    blockers.push(
      "SOURCE_LIVE_SERP_RESULTS_EMPTY"
    );
  }


  /*
   * Stage 6:
   * Expected Coverage and Gap Analysis must be built from
   * observed upstream topics rather than empty placeholder
   * arrays.
   */
  if (
    input.expectedCoverage
      .topics.length ===
    0
  ) {
    blockers.push(
      "SOURCE_EXPECTED_COVERAGE_TOPICS_MISSING"
    );
  }


  if (
    input.gaps
      .observations.length ===
    0
  ) {
    blockers.push(
      "SOURCE_GAP_OBSERVATIONS_MISSING"
    );
  }


  /*
   * Stage 7:
   * Evidence Graph cannot be represented as "complete"
   * when no real sources were supplied.
   *
   * The downstream Claim Ledger still decides whether each
   * individual claim is VERIFIED/PARTIAL/UNSUPPORTED/etc.
   */
  if (
    input.evidenceGraph
      .sources.length ===
    0
  ) {
    blockers.push(
      "SOURCE_EVIDENCE_SOURCES_MISSING"
    );
  }


  /*
   * Stage 8:
   * section contracts must describe real information jobs.
   */
  if (
    input.sectionBlueprints
      .sections.length ===
    0
  ) {
    blockers.push(
      "SOURCE_SECTION_BLUEPRINTS_MISSING"
    );
  }


  /*
   * Provenance is required for the three critical external
   * evidence boundaries.
   */
  if (
    !hasStageProvenance(
      provenance,
      "QUERY_GRAPH"
    )
  ) {
    blockers.push(
      "SOURCE_QUERY_PROVENANCE_MISSING"
    );
  }


  if (
    !hasStageProvenance(
      provenance,
      "SERP_RESEARCH"
    )
  ) {
    blockers.push(
      "SOURCE_SERP_PROVENANCE_MISSING"
    );
  }


  if (
    !hasStageProvenance(
      provenance,
      "EVIDENCE_GRAPH"
    )
  ) {
    blockers.push(
      "SOURCE_EVIDENCE_PROVENANCE_MISSING"
    );
  }


  return Object.freeze({
    ready:
      blockers.length ===
      0,

    blockers:
      Object.freeze(
        blockers
      ),
  });
}


export function assertProductionMasterSourceBundle(
  bundle:
    ProductionMasterSourceBundle
): void {
  const inspection =
    inspectProductionMasterSourceBundle(
      bundle
    );


  if (
    !inspection.ready
  ) {
    throw new ProductionMasterSourceBlockedError(
      inspection.blockers
    );
  }
}


/*
 * Single production boundary for source-derived Stage 1-8
 * artifact construction.
 *
 * IMPORTANT:
 * - no reconstruction from legacy final-plan artifacts
 * - no reconstruction from legacy blueprint-shadow artifacts
 * - no synthetic query metrics
 * - no synthetic SERP
 * - no synthetic evidence
 * - no implicit mission semantics
 *
 * All domain artifacts are still built by the canonical
 * Stage 1-8 builders.
 */
export function buildProductionMasterArtifactsFromSources(
  bundle:
    ProductionMasterSourceBundle
) {
  assertProductionMasterSourceBundle(
    bundle
  );


  return buildProductionMasterArtifacts(
    bundle.input
  );
}
