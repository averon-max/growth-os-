import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inspectMasterRuntimeSnapshot,
} from "./master-runtime-adapter";

import {
  attachMasterRuntimeToPlan,
  buildMasterRuntimePersistenceEnvelope,
  buildMasterRuntimeSnapshot,
  serializeMasterRuntimeForPersistence,
  type MasterRuntimeArtifacts,
} from "./master-runtime-orchestrator";


function artifacts():
  MasterRuntimeArtifacts {
  return {
    mission: {
      version:
        1,

      id:
        "mission-1",

      websiteId:
        "site-1",

      topic:
        "what is credit monitoring",

      audience:
        "US consumers concerned about fraud and identity theft",

      readerGoal:
        "Understand what credit monitoring does, its limitations, and what action to take after an alert.",

      businessRelationship:
        "DIRECT",

      jurisdiction:
        "US",

      language:
        "en",

      location:
        "United States",

      riskClass:
        "YMYL_FINANCE",

      createdAt:
        new Date(
          "2026-09-21T20:00:00.000Z"
        ),
    } as MasterRuntimeArtifacts[
      "mission"
    ],

    queryGraph: {
      version:
        "QUERY_GRAPH_V1",

      missionId:
        "mission-1",

      nodes:
        [],

      edges:
        [],

      boundaries:
        [],

      provenance:
        [],
    } as unknown as MasterRuntimeArtifacts[
      "queryGraph"
    ],

    serpResearch:
      null,

    expectedCoverage: {
      version:
        "EXPECTED_COVERAGE_V1",

      missionId:
        "mission-1",

      queryGraphVersion:
        "QUERY_GRAPH_V1",

      items:
        [],

      requiredTopics:
        [],

      supportingTopics:
        [],

      opportunityTopics:
        [],

      excludedTopics:
        [],

      evidence:
        [],
    } as MasterRuntimeArtifacts[
      "expectedCoverage"
    ],

    gaps: {
      version:
        "GAP_ENGINE_V1",

      missionId:
        "mission-1",

      gaps:
        [],

      byType: {
        MISSION_GAP:
          0,

        EXPECTED_GAP:
          0,

        DEPTH_GAP:
          0,

        CLARITY_GAP:
          0,

        EVIDENCE_GAP:
          0,

        ACTION_GAP:
          0,

        ORIGINAL_VALUE_GAP:
          0,
      },

      criticalCount:
        0,

      majorCount:
        0,

      evidence:
        [],
    } as MasterRuntimeArtifacts[
      "gaps"
    ],

    originalValue: {
      version:
        "ORIGINAL_VALUE_PLAN_V1",

      missionId:
        "mission-1",

      strength:
        "DEFENSIBLE",

      gate:
        "PASS",

      assets: [
        {
          id:
            "asset-1",

          type:
            "COMPARISON_MATRIX",

          title:
            "Detection vs prevention matrix",

          description:
            "Original synthesis of monitoring capabilities and limitations.",

          firstParty:
            false,

          verified:
            true,
        },
      ],

      commodity: {
        risk:
          "LOW",

        evidence:
          [],
      },

      issues:
        [],

      evidence:
        [],
    } as MasterRuntimeArtifacts[
      "originalValue"
    ],

    evidenceGraph: {
      version:
        "EVIDENCE_GRAPH_V1",

      sources:
        [],

      claimEvidence:
        [],
    } as MasterRuntimeArtifacts[
      "evidenceGraph"
    ],

    claimLedger: {
      version:
        "CLAIM_LEDGER_V1",

      claims:
        [],

      counts: {
        VERIFIED:
          0,

        PARTIAL:
          0,

        UNSUPPORTED:
          0,

        CONTRADICTED:
          0,

        STALE:
          0,

        JURISDICTION_MISMATCH:
          0,
      },

      verified:
        0,

      unsupported:
        0,

      blockingCandidateCount:
        0,
    } as MasterRuntimeArtifacts[
      "claimLedger"
    ],

    searchBlueprint: {
      version:
        "MASTER_SEARCH_BLUEPRINT_V1",

      revision:
        1,

      missionId:
        "mission-1",

      action:
        "CREATE",

      primaryQuery:
        "what is credit monitoring",

      queryNodeIds:
        [],

      intent:
        "INFORMATIONAL",

      pageType:
        "ARTICLE",

      requiredTopics:
        [],

      supportingTopics:
        [],

      excludedTopics:
        [],

      requiredEntities:
        [],

      questions:
        [],

      evidenceIds:
        [],

      requiredClaims:
        [],

      forbiddenClaims:
        [],

      competitorStrengths:
        [],

      competitorWeaknesses:
        [],

      gaps:
        [],

      originalAssets: [
        "asset-1",
      ],

      internalLinkTargets:
        [],

      technicalRequirements:
        [],

      fingerprint:
        "blueprint-1",
    } as MasterRuntimeArtifacts[
      "searchBlueprint"
    ],

    sectionBlueprints: {
      version:
        "SECTION_BLUEPRINT_SET_V1",

      blueprintFingerprint:
        "blueprint-1",

      h1Mission:
        "what is credit monitoring",

      sections: [
        {
          heading:
            "What Credit Monitoring Does",

          mission:
            "Explain what credit monitoring detects.",

          queryNodeIds:
            [],

          requiredClaims:
            [],

          forbiddenClaims:
            [],

          evidenceIds:
            [],

          internalLinks:
            [],

          expectedOutcome:
            "Reader understands the detection role.",
        },
      ],

      rules: [
        "ONE_INFORMATION_JOB_EQUALS_ONE_LOGICAL_SECTION",
      ],
    } as MasterRuntimeArtifacts[
      "sectionBlueprints"
    ],

    internalLinkPlan:
      [],

    styleRules: [
      "Direct answers before elaboration.",
      "No filler.",
    ],
  };
}


describe(
  "Master Runtime Orchestrator V1",
  () => {
    it(
      "assembles only supplied Stage 1-8 artifacts",
      () => {
        const runtime =
          buildMasterRuntimeSnapshot(
            artifacts()
          );

        expect(
          runtime.version
        ).toBe(
          "MASTER_RUNTIME_SNAPSHOT_V1"
        );

        expect(
          runtime.mission.id
        ).toBe(
          "mission-1"
        );

        expect(
          runtime.searchBlueprint
            .version
        ).toBe(
          "MASTER_SEARCH_BLUEPRINT_V1"
        );

        expect(
          runtime.sectionBlueprints
            .version
        ).toBe(
          "SECTION_BLUEPRINT_SET_V1"
        );
      }
    );


    it(
      "survives the real JSON persistence boundary",
      () => {
        const runtime =
          buildMasterRuntimeSnapshot(
            artifacts()
          );

        const persisted =
          serializeMasterRuntimeForPersistence(
            runtime
          ) as {
            mission: {
              createdAt:
                unknown;
            };
          };

        expect(
          typeof persisted
            .mission
            .createdAt
        ).toBe(
          "string"
        );

        const inspection =
          inspectMasterRuntimeSnapshot({
            masterRuntime:
              persisted,
          });

        expect(
          inspection.readiness
        ).toBe(
          "READY"
        );

        expect(
          inspection.runtime
            ?.mission
            .createdAt
        ).toBeInstanceOf(
          Date
        );
      }
    );


    it(
      "creates a persistence envelope with explicit masterRuntime",
      () => {
        const envelope =
          buildMasterRuntimePersistenceEnvelope(
            artifacts()
          );

        expect(
          envelope.version
        ).toBe(
          "MASTER_RUNTIME_PERSISTENCE_ENVELOPE_V1"
        );

        expect(
          envelope.masterRuntime
        ).toBeTruthy();
      }
    );


    it(
      "adds masterRuntime without deleting the legacy plan during migration",
      () => {
        const plan =
          attachMasterRuntimeToPlan({
            legacyPlan: {
              version:
                "CONTENT_PLAN_V2",

              searchBlueprintShadow: {
                version:
                  "SEARCH_BLUEPRINT_V1",

                mode:
                  "SHADOW",
              },
            },

            artifacts:
              artifacts(),
          });

        expect(
          plan.version
        ).toBe(
          "CONTENT_PLAN_V2"
        );

        expect(
          plan.searchBlueprintShadow
        ).toBeTruthy();

        expect(
          plan.masterRuntime
        ).toBeTruthy();
      }
    );


    it(
      "persists NO_GO for audit while the writer remains blocked",
      () => {
        const value =
          artifacts();

        value.searchBlueprint = {
          ...value.searchBlueprint,

          action:
            "NO_GO",
        };

        value.sectionBlueprints = {
          ...value.sectionBlueprints,

          sections:
            [],
        };

        const runtime =
          buildMasterRuntimeSnapshot(
            value
          );

        expect(
          runtime.searchBlueprint
            .action
        ).toBe(
          "NO_GO"
        );

        const persisted =
          serializeMasterRuntimeForPersistence(
            runtime
          );

        const inspection =
          inspectMasterRuntimeSnapshot({
            masterRuntime:
              persisted,
          });

        expect(
          inspection.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          inspection.blockers
        ).toContain(
          "MASTER_RUNTIME_NO_GO"
        );

        expect(
          inspection.runtime
            ?.searchBlueprint
            .action
        ).toBe(
          "NO_GO"
        );
      }
    );


    it(
      "persists rejected original value for audit while the writer remains blocked",
      () => {
        const value =
          artifacts();

        value.originalValue = {
          ...value.originalValue,

          gate:
            "REJECTED",

          strength:
            "NONE",
        };

        const runtime =
          buildMasterRuntimeSnapshot(
            value
          );

        expect(
          runtime.originalValue
            .gate
        ).toBe(
          "REJECTED"
        );

        const inspection =
          inspectMasterRuntimeSnapshot({
            masterRuntime:
              serializeMasterRuntimeForPersistence(
                runtime
              ),
          });

        expect(
          inspection.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          inspection.blockers
        ).toContain(
          "MASTER_RUNTIME_ORIGINAL_VALUE_BLOCKED"
        );

        expect(
          inspection.runtime
            ?.originalValue
            .gate
        ).toBe(
          "REJECTED"
        );
      }
    );


    it(
      "persists blocked claims for audit while the writer remains blocked",
      () => {
        const value =
          artifacts();

        value.claimLedger = {
          version:
            "CLAIM_LEDGER_V1",

          claims: [
            {
              id:
                "claim-1",

              text:
                "Unsupported financial claim.",

              category:
                "FINANCIAL",

              risk:
                "HIGH",

              evidenceIds:
                [],

              status:
                "UNSUPPORTED",
            },
          ],

          counts: {
            VERIFIED:
              0,

            PARTIAL:
              0,

            UNSUPPORTED:
              1,

            CONTRADICTED:
              0,

            STALE:
              0,

            JURISDICTION_MISMATCH:
              0,
          },

          verified:
            0,

          unsupported:
            1,

          blockingCandidateCount:
            1,
        };

        const runtime =
          buildMasterRuntimeSnapshot(
            value
          );

        expect(
          runtime.claimLedger
            .unsupported
        ).toBe(
          1
        );

        const inspection =
          inspectMasterRuntimeSnapshot({
            masterRuntime:
              serializeMasterRuntimeForPersistence(
                runtime
              ),
          });

        expect(
          inspection.readiness
        ).toBe(
          "BLOCKED"
        );

        expect(
          inspection.blockers
        ).toContain(
          "MASTER_RUNTIME_CLAIM_GATE_BLOCKED"
        );

        expect(
          inspection.runtime
            ?.claimLedger
            .unsupported
        ).toBe(
          1
        );
      }
    );


    it(
      "blocks blueprint revision mismatch",
      () => {
        const value =
          artifacts();

        value.sectionBlueprints = {
          ...value.sectionBlueprints,

          blueprintFingerprint:
            "wrong-blueprint",
        };

        expect(
          () =>
            buildMasterRuntimeSnapshot(
              value
            )
        ).toThrow(
          "MASTER_RUNTIME_ORCHESTRATION_BLOCKED:MASTER_RUNTIME_BLUEPRINT_REVISION_MISMATCH"
        );
      }
    );


    it(
      "rejects a non-object legacy plan",
      () => {
        expect(
          () =>
            attachMasterRuntimeToPlan({
              legacyPlan:
                "not-a-plan",

              artifacts:
                artifacts(),
            })
        ).toThrow(
          "MASTER_RUNTIME_LEGACY_PLAN_INVALID"
        );
      }
    );
  }
);
