import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

import {
  ARTICLE_TEMPLATE_POLICIES_V1,
  selectArticleTemplateV1,
} from "./article-template-policy-v1";


const planner =
  readFileSync(
    resolve(
      process.cwd(),
      "src/lib/content/production-master-live-stage-planner.ts"
    ),
    "utf8"
  );


describe(
  "Stage Plan evidence-sensitive role recovery V1",
  () => {
    it(
      "does not make explainer benefit or cost mandatory",
      () => {
        const policy =
          ARTICLE_TEMPLATE_POLICIES_V1
            .EXPLAINER_GUIDE;

        expect(
          policy.requiredRoles
        ).not.toContain(
          "BENEFIT"
        );

        expect(
          policy.requiredRoles
        ).not.toContain(
          "COST"
        );

        expect(
          policy.optionalRoles
        ).toContain(
          "BENEFIT"
        );

        expect(
          policy.optionalRoles
        ).toContain(
          "COST"
        );

        expect(
          policy.evidenceSensitiveRoles
        ).toEqual(
          expect.arrayContaining([
            "BENEFIT",
            "COST",
          ])
        );
      }
    );


    it(
      "keeps what-is routing on EXPLAINER_GUIDE",
      () => {
        const selected =
          selectArticleTemplateV1({
            primaryQuery:
              "what is credit monitoring",

            intent:
              "INFORMATIONAL",

            pageType:
              "ARTICLE",

            hasGeoIntent:
              false,

            rankingEvidenceAvailable:
              false,

            firstPartyExperienceAvailable:
              false,
          });

        expect(
          selected.id
        ).toBe(
          "EXPLAINER_GUIDE"
        );
      }
    );


    it(
      "routes chosen evidence-sensitive roles into existing completeness recovery",
      () => {
        expect(
          planner
        ).toContain(
          "EVIDENCE_SENSITIVE_ROLE_CLAIM_COMPLETENESS_RECOVERY_V1"
        );

        expect(
          planner
        ).toContain(
          "sections[].evidenceSensitiveRole.requiredClaimIds"
        );

        expect(
          planner
        ).toContain(
          "resolveSelectedTemplatePolicyV1({"
        );

        expect(
          planner
        ).toContain(
          "section.requiredClaimIds.length ==="
        );
      }
    );


    it(
      "runs recovery before deterministic template coverage",
      () => {
        const recovery =
          planner.indexOf(
            "EVIDENCE_SENSITIVE_ROLE_CLAIM_COMPLETENESS_RECOVERY_V1"
          );

        const coverage =
          planner.indexOf(
            "TEMPLATE_COVERAGE_PRODUCTION_GATE_V1"
          );

        expect(
          recovery
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          coverage
        ).toBeGreaterThan(
          recovery
        );
      }
    );


    it(
      "keeps exactly one bounded Stage Plan retry path",
      () => {
        const matches =
          planner.match(
            /STAGE_PLAN_COMPLETENESS_RETRY_V4:/g
          ) ?? [];

        expect(
          matches
        ).toHaveLength(
          1
        );

        expect(
          planner
        ).toContain(
          "forceAlternateProvider:"
        );
      }
    );


    it(
      "tells regeneration to omit unsupported optional roles rather than invent claims",
      () => {
        expect(
          planner
        ).toContain(
          "omit that optional role instead of inventing a claim"
        );
      }
    );
  }
);
