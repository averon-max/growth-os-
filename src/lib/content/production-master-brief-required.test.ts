import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ProductionMasterBriefBlockedError,
  assertProductionMasterBriefReady,
} from "./production-master-brief-required";


describe(
  "Production Master Brief fail-closed ingress",
  () => {
    it(
      "permits a ready persisted master runtime",
      () => {
        expect(
          () =>
            assertProductionMasterBriefReady({
              readiness: {
                readiness:
                  "READY",

                blockers:
                  [],

                adapterBlockers:
                  [],
              },

              masterRuntime: {
                version:
                  "MASTER_RUNTIME_SNAPSHOT_V1",
              },
            })
        ).not.toThrow();
      }
    );


    it(
      "blocks missing Stage 1-8 runtime",
      () => {
        expect(
          () =>
            assertProductionMasterBriefReady({
              readiness: {
                readiness:
                  "BLOCKED",

                blockers: [
                  "STAGE_2_8_ARTIFACT_PIPELINE_NOT_CONNECTED",
                  "MASTER_RUNTIME_NOT_PERSISTED",
                ],

                adapterBlockers:
                  [],
              },

              masterRuntime:
                null,
            })
        ).toThrow(
          ProductionMasterBriefBlockedError
        );
      }
    );


    it(
      "never treats null masterRuntime as READY",
      () => {
        try {
          assertProductionMasterBriefReady({
            readiness: {
              readiness:
                "READY",

              blockers:
                [],

              adapterBlockers:
                [],
            },

            masterRuntime:
              null,
          });


          throw new Error(
            "EXPECTED_BLOCK"
          );
        } catch (
          error
        ) {
          expect(
            error
          ).toBeInstanceOf(
            ProductionMasterBriefBlockedError
          );


          expect(
            (
              error as
                ProductionMasterBriefBlockedError
            ).blockers
          ).toContain(
            "MASTER_RUNTIME_NOT_PERSISTED"
          );
        }
      }
    );


    it(
      "preserves real adapter blockers for diagnostics",
      () => {
        try {
          assertProductionMasterBriefReady({
            readiness: {
              readiness:
                "BLOCKED",

              blockers: [
                "MASTER_RUNTIME_INVALID",
              ],

              adapterBlockers: [
                "MASTER_RUNTIME_QUERY_GRAPH_INVALID",
              ],
            },

            masterRuntime: {
              invalid:
                true,
            },
          });
        } catch (
          error
        ) {
          expect(
            error
          ).toBeInstanceOf(
            ProductionMasterBriefBlockedError
          );


          expect(
            (
              error as
                ProductionMasterBriefBlockedError
            ).adapterBlockers
          ).toEqual([
            "MASTER_RUNTIME_QUERY_GRAPH_INVALID",
          ]);
        }
      }
    );
  }
);
