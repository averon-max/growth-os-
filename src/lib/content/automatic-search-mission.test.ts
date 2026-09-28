import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveAutomaticSearchMission,
} from "./automatic-search-mission";


describe(
  "Automatic SearchMission",
  () => {
    it(
      "builds the credit-monitoring mission automatically",
      () => {
        const mission =
          resolveAutomaticSearchMission({
            topic:
              "credit monitoring",

            industry:
              "credit monitoring and identity protection",

            businessLocation:
              "New York",

            env: {
              CONTENT_DEFAULT_LOCATION:
                "United States",

              CONTENT_DEFAULT_JURISDICTION:
                "US",

              CONTENT_DEFAULT_LANGUAGE:
                "en",
            },
          });

        expect(
          mission.businessRelationship
        ).toBe(
          "DIRECT"
        );

        expect(
          mission.riskClass
        ).toBe(
          "YMYL_FINANCE"
        );

        expect(
          mission.location
        ).toBe(
          "United States"
        );

        expect(
          mission.jurisdiction
        ).toBe(
          "US"
        );

        expect(
          mission.language
        ).toBe(
          "en"
        );
      }
    );


    it(
      "does not manufacture research metrics or evidence",
      () => {
        const mission =
          resolveAutomaticSearchMission({
            topic:
              "canonical tags",

            industry:
              "SEO software",

            env: {
              CONTENT_DEFAULT_LOCATION:
                "United States",

              CONTENT_DEFAULT_JURISDICTION:
                "US",

              CONTENT_DEFAULT_LANGUAGE:
                "en",
            },
          });

        expect(
          mission.riskClass
        ).toBe(
          "NORMAL"
        );

        expect(
          Object.keys(
            mission
          )
        ).not.toContain(
          "searchVolume"
        );

        expect(
          Object.keys(
            mission
          )
        ).not.toContain(
          "evidence"
        );
      }
    );
  }
);
