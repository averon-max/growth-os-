import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createSearchMission,
  reviseSearchMission,
} from "./search-mission";


describe(
  "SearchMission V1",
  () => {
    const baseInput = {
      id:
        "mission-credit-monitoring-v1",

      websiteId:
        "website-scanmycreds",

      topic:
        "Credit monitoring",

      audience:
        "US consumers concerned about fraud and identity theft",

      readerGoal:
        "Understand what credit monitoring does, what it cannot do, whether it is useful, and what action to take after an alert.",

      businessRelationship:
        "DIRECT" as const,

      jurisdiction:
        "US",

      language:
        "en",

      location:
        "United States",

      riskClass:
        "YMYL_FINANCE" as const,

      createdAt:
        new Date(
          "2026-09-21T00:00:00.000Z"
        ),

      version:
        1,
    };


    it(
      "implements the master SearchMission contract exactly",
      () => {
        const mission =
          createSearchMission(
            baseInput
          );

        expect(
          mission
        ).toEqual({
          id:
            "mission-credit-monitoring-v1",

          websiteId:
            "website-scanmycreds",

          topic:
            "Credit monitoring",

          audience:
            "US consumers concerned about fraud and identity theft",

          readerGoal:
            "Understand what credit monitoring does, what it cannot do, whether it is useful, and what action to take after an alert.",

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
              "2026-09-21T00:00:00.000Z"
            ),

          version:
            1,
        });
      }
    );


    it(
      "is immutable after creation",
      () => {
        const mission =
          createSearchMission(
            baseInput
          );

        expect(
          Object.isFrozen(
            mission
          )
        ).toBe(
          true
        );
      }
    );


    it(
      "does not infer semantic mission fields",
      () => {
        expect(
          () =>
            createSearchMission({
              ...baseInput,

              audience:
                " ",
            })
        ).toThrow(
          "SEARCH_MISSION_AUDIENCE_REQUIRED"
        );

        expect(
          () =>
            createSearchMission({
              ...baseInput,

              readerGoal:
                "",
            })
        ).toThrow(
          "SEARCH_MISSION_READER_GOAL_REQUIRED"
        );
      }
    );


    it(
      "requires explicit language and location",
      () => {
        expect(
          () =>
            createSearchMission({
              ...baseInput,

              language:
                "",
            })
        ).toThrow(
          "SEARCH_MISSION_LANGUAGE_REQUIRED"
        );

        expect(
          () =>
            createSearchMission({
              ...baseInput,

              location:
                " ",
            })
        ).toThrow(
          "SEARCH_MISSION_LOCATION_REQUIRED"
        );
      }
    );


    it(
      "allows jurisdiction to remain absent",
      () => {
        const mission =
          createSearchMission({
            ...baseInput,

            jurisdiction:
              undefined,
          });

        expect(
          mission.jurisdiction
        ).toBeUndefined();
      }
    );


    it(
      "requires a positive integer version",
      () => {
        expect(
          () =>
            createSearchMission({
              ...baseInput,

              version:
                0,
            })
        ).toThrow(
          "SEARCH_MISSION_VERSION_INVALID"
        );

        expect(
          () =>
            createSearchMission({
              ...baseInput,

              version:
                1.5,
            })
        ).toThrow(
          "SEARCH_MISSION_VERSION_INVALID"
        );
      }
    );


    it(
      "creates a new immutable version instead of mutating the previous mission",
      () => {
        const original =
          createSearchMission(
            baseInput
          );

        const revised =
          reviseSearchMission({
            previous:
              original,

            id:
              "mission-credit-monitoring-v2",

            createdAt:
              new Date(
                "2026-09-22T00:00:00.000Z"
              ),

            changes: {
              readerGoal:
                "Understand credit monitoring and decide what to do after a suspicious alert.",
            },
          });

        expect(
          original.version
        ).toBe(
          1
        );

        expect(
          revised.version
        ).toBe(
          2
        );

        expect(
          revised.websiteId
        ).toBe(
          original.websiteId
        );

        expect(
          revised.readerGoal
        ).not.toBe(
          original.readerGoal
        );

        expect(
          Object.isFrozen(
            revised
          )
        ).toBe(
          true
        );
      }
    );
  }
);
