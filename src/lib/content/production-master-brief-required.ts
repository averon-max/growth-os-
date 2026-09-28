export class ProductionMasterBriefBlockedError
  extends Error {
  readonly code =
    "PRODUCTION_MASTER_BRIEF_BLOCKED";

  readonly blockers:
    readonly string[];

  readonly adapterBlockers:
    readonly string[];


  constructor({
    blockers,
    adapterBlockers,
  }: {
    blockers:
      readonly string[];

    adapterBlockers:
      readonly string[];
  }) {
    const normalizedBlockers =
      Object.freeze([
        ...new Set(
          blockers
        ),
      ]);


    const normalizedAdapterBlockers =
      Object.freeze([
        ...new Set(
          adapterBlockers
        ),
      ]);


    super(
      [
        "Production Master Brief is not ready.",
        normalizedBlockers.length >
          0
          ? `Blockers: ${normalizedBlockers.join(", ")}.`
          : null,
        normalizedAdapterBlockers.length >
          0
          ? `Adapter blockers: ${normalizedAdapterBlockers.join(", ")}.`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    );


    this.name =
      "ProductionMasterBriefBlockedError";

    this.blockers =
      normalizedBlockers;

    this.adapterBlockers =
      normalizedAdapterBlockers;
  }
}


export interface ProductionMasterBriefRuntimeState {
  readiness:
    Readonly<{
      readiness:
        "READY" |
        "BLOCKED";

      blockers:
        readonly string[];

      adapterBlockers:
        readonly string[];
    }>;

  masterRuntime:
    unknown | null;
}


export function assertProductionMasterBriefReady(
  state:
    ProductionMasterBriefRuntimeState
): void {
  const blockers =
    [
      ...state
        .readiness
        .blockers,
    ];


  const adapterBlockers =
    [
      ...state
        .readiness
        .adapterBlockers,
    ];


  if (
    state.masterRuntime ===
    null
  ) {
    blockers.push(
      "MASTER_RUNTIME_NOT_PERSISTED"
    );
  }


  if (
    state.readiness
      .readiness !==
      "READY" ||
    state.masterRuntime ===
      null
  ) {
    throw new ProductionMasterBriefBlockedError({
      blockers,

      adapterBlockers,
    });
  }
}
