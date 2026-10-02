import type {
  ArticleSectionRoleV1,
  ArticleTemplatePolicyV1,
} from "./article-template-policy-v1";


export type TemplateCoverageStatusV1 =
  | "PASS"
  | "FAIL";


export interface TemplateCoverageSectionV1 {
  readonly heading:
    string;

  readonly mission:
    string;

  /*
   * Semantic annotations only.
   *
   * These roles do NOT create sections and do NOT become
   * a parallel outline authority.
   *
   * ArticleExecutionPlan remains the sole structural authority.
   */
  readonly roles:
    readonly ArticleSectionRoleV1[];

  readonly requiredClaimIds:
    readonly string[];
}


export interface TemplateCoverageResultV1 {
  readonly version:
    "TEMPLATE_COVERAGE_V1";

  readonly status:
    TemplateCoverageStatusV1;

  readonly templateId:
    ArticleTemplatePolicyV1["id"];

  readonly coveredRoles:
    readonly ArticleSectionRoleV1[];

  readonly missingRequiredRoles:
    readonly ArticleSectionRoleV1[];

  readonly unsupportedEvidenceSensitiveRoles:
    readonly ArticleSectionRoleV1[];
}


export class TemplateCoverageErrorV1
  extends Error {
  constructor(
    readonly code:
      string,

    readonly result:
      Readonly<TemplateCoverageResultV1>
  ) {
    super(
      [
        code,

        result
          .missingRequiredRoles
          .length
          ? `missing=${result.missingRequiredRoles.join(",")}`
          : null,

        result
          .unsupportedEvidenceSensitiveRoles
          .length
          ? `evidence=${result.unsupportedEvidenceSensitiveRoles.join(",")}`
          : null,
      ]
        .filter(
          Boolean
        )
        .join(
          ":"
        )
    );

    this.name =
      "TemplateCoverageErrorV1";
  }
}


function uniqueRoles(
  values:
    readonly ArticleSectionRoleV1[]
): ArticleSectionRoleV1[] {
  return [
    ...new Set(
      values
    ),
  ];
}


export function evaluateTemplateCoverageV1({
  policy,
  sections,
}: {
  readonly policy:
    Readonly<ArticleTemplatePolicyV1>;

  readonly sections:
    readonly Readonly<TemplateCoverageSectionV1>[];
}): Readonly<TemplateCoverageResultV1> {
  const coveredRoles =
    uniqueRoles(
      sections.flatMap(
        (
          section
        ) =>
          section.roles
      )
    );


  const coveredSet =
    new Set<ArticleSectionRoleV1>(
      coveredRoles
    );


  const missingRequiredRoles =
    policy.requiredRoles.filter(
      (
        role
      ) =>
        !coveredSet.has(
          role
        )
    );


  /*
   * Evidence-sensitive roles are checked only when the role is
   * actually part of this article.
   *
   * If the model says a section performs an evidence-sensitive
   * job, at least one owner section must explicitly reference a
   * material claim.
   *
   * Actual claim -> evidence verification remains owned by the
   * existing Evidence Graph / ArticleExecutionPlan pipeline.
   */
  const unsupportedEvidenceSensitiveRoles =
    policy
      .evidenceSensitiveRoles
      .filter(
        (
          role
        ) =>
          coveredSet.has(
            role
          )
      )
      .filter(
        (
          role
        ) =>
          !sections.some(
            (
              section
            ) =>
              section.roles.includes(
                role
              ) &&
              section
                .requiredClaimIds
                .length >
                0
          )
      );


  const status:
    TemplateCoverageStatusV1 =
      (
        missingRequiredRoles
          .length ===
          0 &&
        unsupportedEvidenceSensitiveRoles
          .length ===
          0
      )
        ? "PASS"
        : "FAIL";


  return Object.freeze({
    version:
      "TEMPLATE_COVERAGE_V1",

    status,

    templateId:
      policy.id,

    coveredRoles:
      Object.freeze([
        ...coveredRoles,
      ]),

    missingRequiredRoles:
      Object.freeze([
        ...missingRequiredRoles,
      ]),

    unsupportedEvidenceSensitiveRoles:
      Object.freeze([
        ...unsupportedEvidenceSensitiveRoles,
      ]),
  });
}


export function assertTemplateCoverageV1(
  input:
    Parameters<
      typeof evaluateTemplateCoverageV1
    >[0]
): Readonly<TemplateCoverageResultV1> {
  const result =
    evaluateTemplateCoverageV1(
      input
    );


  if (
    result.status !==
    "PASS"
  ) {
    throw new TemplateCoverageErrorV1(
      "TEMPLATE_COVERAGE_FAILED",
      result
    );
  }


  return result;
}
