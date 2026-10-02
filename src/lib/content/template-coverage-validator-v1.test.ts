import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ARTICLE_TEMPLATE_POLICIES_V1,
} from "./article-template-policy-v1";

import {
  TemplateCoverageErrorV1,
  assertTemplateCoverageV1,
  evaluateTemplateCoverageV1,
} from "./template-coverage-validator-v1";


describe(
  "Template Coverage V1",
  () => {
    it(
      "passes when every required semantic role is represented",
      () => {
        const policy =
          ARTICLE_TEMPLATE_POLICIES_V1
            .COMPARISON;

        const result =
          evaluateTemplateCoverageV1({
            policy,

            sections:
              policy.requiredRoles.map(
                (
                  role,
                  index
                ) => ({
                  heading:
                    `Section ${index + 1}`,

                  mission:
                    `Perform ${role}`,

                  roles: [
                    role,
                  ],

                  requiredClaimIds:
                    policy
                      .evidenceSensitiveRoles
                      .includes(
                        role
                      )
                      ? [
                          `claim-${index}`,
                        ]
                      : [],
                })
              ),
          });

        expect(
          result.status
        ).toBe(
          "PASS"
        );

        expect(
          result
            .missingRequiredRoles
        ).toEqual(
          []
        );
      }
    );


    it(
      "fails when a required semantic job disappears",
      () => {
        const policy =
          ARTICLE_TEMPLATE_POLICIES_V1
            .COMPARISON;

        const missing =
          policy.requiredRoles[0];

        expect(
          () =>
            assertTemplateCoverageV1({
              policy,

              sections:
                policy
                  .requiredRoles
                  .slice(
                    1
                  )
                  .map(
                    (
                      role,
                      index
                    ) => ({
                      heading:
                        `Section ${index + 1}`,

                      mission:
                        `Perform ${role}`,

                      roles: [
                        role,
                      ],

                      requiredClaimIds:
                        policy
                          .evidenceSensitiveRoles
                          .includes(
                            role
                          )
                          ? [
                              `claim-${index}`,
                            ]
                          : [],
                    })
                  ),
            })
        ).toThrow(
          TemplateCoverageErrorV1
        );

        const result =
          evaluateTemplateCoverageV1({
            policy,

            sections:
              [],
          });

        expect(
          result
            .missingRequiredRoles
        ).toContain(
          missing
        );
      }
    );


    it(
      "requires explicit claims for used evidence-sensitive roles",
      () => {
        const policy =
          ARTICLE_TEMPLATE_POLICIES_V1
            .COMPARISON;

        const sensitive =
          policy
            .evidenceSensitiveRoles[0];

        if (!sensitive) {
          return;
        }

        const otherRequired =
          policy
            .requiredRoles
            .filter(
              (
                role
              ) =>
                role !==
                  sensitive
            );

        const result =
          evaluateTemplateCoverageV1({
            policy,

            sections: [
              {
                heading:
                  "Sensitive section",

                mission:
                  "Evidence-sensitive job",

                roles: [
                  sensitive,
                ],

                requiredClaimIds:
                  [],
              },

              ...otherRequired.map(
                (
                  role,
                  index
                ) => ({
                  heading:
                    `Other ${index}`,

                  mission:
                    `Perform ${role}`,

                  roles: [
                    role,
                  ],

                  requiredClaimIds:
                    policy
                      .evidenceSensitiveRoles
                      .includes(
                        role
                      )
                      ? [
                          `claim-${index}`,
                        ]
                      : [],
                })
              ),
            ],
          });

        expect(
          result
            .unsupportedEvidenceSensitiveRoles
        ).toContain(
          sensitive
        );
      }
    );
  }
);
