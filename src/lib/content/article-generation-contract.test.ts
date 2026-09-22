import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  MasterRuntimeSnapshotV1,
} from "./master-runtime-adapter";

import {
  buildArticleGenerationContractV1,
  type MasterSectionBlueprint,
} from "./article-generation-contract";


function artifact<T>(
  name:
    string
): T {
  return {
    name,
  } as unknown as T;
}


function section(
  name:
    string
): MasterSectionBlueprint {
  return artifact<
    MasterSectionBlueprint
  >(
    name
  );
}


function makeRuntime(
  sectionBlueprints:
    readonly MasterSectionBlueprint[]
): MasterRuntimeSnapshotV1 {
  return {
    version:
      "MASTER_RUNTIME_SNAPSHOT_V1",

    mission:
      artifact<
        MasterRuntimeSnapshotV1["mission"]
      >(
        "mission"
      ),

    queryGraph:
      artifact<
        MasterRuntimeSnapshotV1["queryGraph"]
      >(
        "queryGraph"
      ),

    serpResearch:
      artifact<
        MasterRuntimeSnapshotV1["serpResearch"]
      >(
        "serpResearch"
      ),

    expectedCoverage:
      artifact<
        MasterRuntimeSnapshotV1["expectedCoverage"]
      >(
        "expectedCoverage"
      ),

    gaps:
      artifact<
        MasterRuntimeSnapshotV1["gaps"]
      >(
        "gaps"
      ),

    originalValue:
      artifact<
        MasterRuntimeSnapshotV1["originalValue"]
      >(
        "originalValue"
      ),

    evidenceGraph:
      artifact<
        MasterRuntimeSnapshotV1["evidenceGraph"]
      >(
        "evidenceGraph"
      ),

    claimLedger:
      artifact<
        MasterRuntimeSnapshotV1["claimLedger"]
      >(
        "claimLedger"
      ),

    searchBlueprint:
      artifact<
        MasterRuntimeSnapshotV1["searchBlueprint"]
      >(
        "searchBlueprint"
      ),

    sectionBlueprints:
      ({
        h1Mission:
          "Explain credit monitoring clearly and directly.",

        sections:
          sectionBlueprints,
      } as unknown as
        MasterRuntimeSnapshotV1["sectionBlueprints"]),

    internalLinkPlan:
      artifact<
        MasterRuntimeSnapshotV1["internalLinkPlan"]
      >(
        "internalLinkPlan"
      ),

    styleRules:
      artifact<
        MasterRuntimeSnapshotV1["styleRules"]
      >(
        "styleRules"
      ),
  };
}


describe(
  "Article Generation Contract V1",
  () => {
    it(
      "inherits authoritative artifacts directly from Master Runtime",
      () => {
        const runtime =
          makeRuntime([
            section(
              "section-a"
            ),
          ]);

        const contract =
          buildArticleGenerationContractV1(
            runtime
          );

        expect(
          contract.version
        ).toBe(
          "ARTICLE_GENERATION_CONTRACT_V1"
        );

        expect(
          contract.sourceRuntimeVersion
        ).toBe(
          "MASTER_RUNTIME_SNAPSHOT_V1"
        );

        expect(
          contract.mission
        ).toBe(
          runtime.mission
        );

        expect(
          contract.queryGraph
        ).toBe(
          runtime.queryGraph
        );

        expect(
          contract.evidenceGraph
        ).toBe(
          runtime.evidenceGraph
        );

        expect(
          contract.claimLedger
        ).toBe(
          runtime.claimLedger
        );

        expect(
          contract.searchBlueprint
        ).toBe(
          runtime.searchBlueprint
        );

        expect(
          contract.h1Mission
        ).toBe(
          runtime.sectionBlueprints.h1Mission
        );
      }
    );


    it(
      "creates one deterministic generation contract per section blueprint",
      () => {
        const first =
          section(
            "first"
          );

        const second =
          section(
            "second"
          );

        const third =
          section(
            "third"
          );

        const contract =
          buildArticleGenerationContractV1(
            makeRuntime([
              first,
              second,
              third,
            ])
          );

        expect(
          contract.sectionContracts
        ).toHaveLength(
          3
        );

        expect(
          contract.sectionContracts.map(
            (
              item
            ) =>
              item.blueprint
          )
        ).toEqual([
          first,
          second,
          third,
        ]);

        expect(
          contract.sectionContracts.map(
            (
              item
            ) =>
              item.sectionIndex
          )
        ).toEqual([
          0,
          1,
          2,
        ]);

        expect(
          contract.sectionContracts.map(
            (
              item
            ) =>
              item.sectionNumber
          )
        ).toEqual([
          1,
          2,
          3,
        ]);

        expect(
          contract.provenance.sectionCount
        ).toBe(
          3
        );
      }
    );


    it(
      "locks non-negotiable writer rules at the contract boundary",
      () => {
        const contract =
          buildArticleGenerationContractV1(
            makeRuntime([
              section(
                "section-a"
              ),
            ])
          );

        const rules =
          contract
            .sectionContracts[0]
            ?.hardRules;

        expect(
          rules
        ).toEqual({
          canonicalH1OwnedByArticle:
            true,

          bodyMayContainH1:
            false,

          mayInventMetrics:
            false,

          mayInventEvidence:
            false,

          mayInventClaims:
            false,

          mayInventHeadingTargets:
            false,

          preserveSectionOrder:
            true,
        });
      }
    );


    it(
      "freezes the generation envelope and section execution plan",
      () => {
        const contract =
          buildArticleGenerationContractV1(
            makeRuntime([
              section(
                "section-a"
              ),
              section(
                "section-b"
              ),
            ])
          );

        expect(
          Object.isFrozen(
            contract
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            contract.sectionBlueprints
          )
        ).toBe(
          true
        );

        expect(
          Object.isFrozen(
            contract.sectionContracts
          )
        ).toBe(
          true
        );

        expect(
          contract.sectionContracts.every(
            (
              item
            ) =>
              Object.isFrozen(
                item
              ) &&
              Object.isFrozen(
                item.hardRules
              )
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "blocks generation when no section blueprints exist",
      () => {
        expect(
          () =>
            buildArticleGenerationContractV1(
              makeRuntime([])
            )
        ).toThrow(
          "ARTICLE_GENERATION_CONTRACT_BLOCKED:NO_SECTION_BLUEPRINTS"
        );
      }
    );


    it(
      "blocks anything that is not a Master Runtime snapshot",
      () => {
        const invalid = {
          ...makeRuntime([
            section(
              "section-a"
            ),
          ]),

          version:
            "LEGACY_CONTENT_PLAN",
        } as unknown as
          MasterRuntimeSnapshotV1;

        expect(
          () =>
            buildArticleGenerationContractV1(
              invalid
            )
        ).toThrow(
          "ARTICLE_GENERATION_CONTRACT_BLOCKED:INVALID_MASTER_RUNTIME_VERSION"
        );
      }
    );


    it(
      "does not reintroduce legacy writer fields at the master contract boundary",
      () => {
        const contract =
          buildArticleGenerationContractV1(
            makeRuntime([
              section(
                "section-a"
              ),
            ])
          );

        expect(
          "reason" in
            contract
        ).toBe(
          false
        );

        expect(
          "recommendation" in
            contract
        ).toBe(
          false
        );

        expect(
          "outline" in
            contract
        ).toBe(
          false
        );

        expect(
          "researchContext" in
            contract
        ).toBe(
          false
        );
      }
    );
  }
);
