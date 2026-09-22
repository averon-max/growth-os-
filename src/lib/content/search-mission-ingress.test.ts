import {
  describe,
  expect,
  it,
} from "vitest";

import {
  parseOptionalExplicitSearchMissionInput,
} from "./search-mission-ingress";


describe(
  "Explicit SearchMission ingress",
  () => {
    it(
      "accepts explicit mission semantics without inferring anything",
      () => {
        const result =
          parseOptionalExplicitSearchMissionInput({
            audience:
              "US consumers concerned about fraud and identity theft",

            readerGoal:
              "Understand what credit monitoring does, what it cannot do, and what action to take after an alert.",

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
          });

        expect(
          result.ok
        ).toBe(
          true
        );

        if (!result.ok) {
          return;
        }

        expect(
          result.value
        ).toEqual({
          audience:
            "US consumers concerned about fraud and identity theft",

          readerGoal:
            "Understand what credit monitoring does, what it cannot do, and what action to take after an alert.",

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
        });
      }
    );


    it(
      "keeps legacy callers compatible without manufacturing mission semantics",
      () => {
        const result =
          parseOptionalExplicitSearchMissionInput(
            undefined
          );

        expect(
          result
        ).toEqual({
          ok:
            true,

          value:
            undefined,
        });
      }
    );


    it(
      "fails closed when required explicit semantics are missing",
      () => {
        const result =
          parseOptionalExplicitSearchMissionInput({
            audience:
              "US consumers",

            readerGoal:
              "",

            businessRelationship:
              "DIRECT",

            language:
              "en",

            location:
              "United States",

            riskClass:
              "YMYL_FINANCE",
          });

        expect(
          result.ok
        ).toBe(
          false
        );

        if (result.ok) {
          return;
        }

        expect(
          result.code
        ).toBe(
          "SEARCH_MISSION_INPUT_INVALID"
        );
      }
    );


    it(
      "does not infer risk class or business relationship",
      () => {
        const result =
          parseOptionalExplicitSearchMissionInput({
            audience:
              "US consumers",

            readerGoal:
              "Understand the topic.",

            language:
              "en",

            location:
              "United States",
          });

        expect(
          result.ok
        ).toBe(
          false
        );
      }
    );


    it(
      "allows jurisdiction to remain absent",
      () => {
        const result =
          parseOptionalExplicitSearchMissionInput({
            audience:
              "General readers",

            readerGoal:
              "Understand the topic.",

            businessRelationship:
              "ADJACENT",

            language:
              "en",

            location:
              "Canada",

            riskClass:
              "NORMAL",
          });

        expect(
          result.ok
        ).toBe(
          true
        );

        if (!result.ok) {
          return;
        }

        expect(
          result.value
            ?.jurisdiction
        ).toBeUndefined();
      }
    );
  }
);
