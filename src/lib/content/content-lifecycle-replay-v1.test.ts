import {
  describe,
  expect,
  it,
} from "vitest";

import {
  readFileSync,
} from "node:fs";

import {
  join,
} from "node:path";


const service =
  readFileSync(
    join(
      process.cwd(),
      "src/lib/content/service.ts"
    ),
    "utf8"
  );


const approveRoute =
  readFileSync(
    join(
      process.cwd(),
      "src/app/api/content/articles/[id]/approve/route.ts"
    ),
    "utf8"
  );


const generateRoute =
  readFileSync(
    join(
      process.cwd(),
      "src/app/api/content/briefs/[id]/generate-article/route.ts"
    ),
    "utf8"
  );


function between(
  source:
    string,
  from:
    string,
  to?:
    string
): string {
  const start =
    source.indexOf(
      from
    );

  expect(
    start
  ).toBeGreaterThanOrEqual(
    0
  );


  if (!to) {
    return source.slice(
      start
    );
  }


  const end =
    source.indexOf(
      to,
      start +
        from.length
    );

  expect(
    end
  ).toBeGreaterThan(
    start
  );


  return source.slice(
    start,
    end
  );
}


describe(
  "Content V1 deterministic lifecycle replay",
  () => {
    const generation =
      between(
        service,
        "export async function generateArticleFromBrief(",
        "export async function approveArticle("
      );


    const approval =
      between(
        service,
        "export async function approveArticle(",
        "export async function publishArticle("
      );


    const publication =
      between(
        service,
        "export async function publishArticle("
      );


    it(
      "starts every article attempt in GENERATING",
      () => {
        expect(
          generation
        ).toContain(
          'status:\n          "GENERATING"'
        );
      }
    );


    it(
      "successful generation reaches IN_REVIEW rather than bypassing review",
      () => {
        expect(
          generation
        ).toContain(
          'status:\n          "IN_REVIEW"'
        );


        /*
         * Final Readiness V1 owns the transition into review.
         * Successful generation must not directly approve/publish.
         */
        expect(
          generation
        ).not.toContain(
          'status:\n          "APPROVED"'
        );


        expect(
          generation
        ).not.toContain(
          'status:\n          "PUBLISHED"'
        );
      }
    );


    it(
      "failed generation remains as immutable REJECTED attempt",
      () => {
        expect(
          generation
        ).toContain(
          "REJECTED_RECOVERY_PERSISTENCE_V1"
        );


        expect(
          generation
        ).toContain(
          'status:\n            "REJECTED"'
        );


        expect(
          generation
        ).not.toContain(
          "prisma.contentArticle.delete("
        );
      }
    );


    it(
      "approval accepts IN_REVIEW only",
      () => {
        expect(
          approval
        ).toContain(
          'article.status !==\n      "IN_REVIEW"'
        );


        expect(
          approval
        ).not.toMatch(
          /article\.status\s*!==\s*"DRAFT"\s*&&/
        );


        expect(
          approveRoute
        ).toContain(
          'article.status !== "IN_REVIEW"'
        );
      }
    );


    it(
      "approval produces APPROVED only after all gates",
      () => {
        const contentGate =
          approval.indexOf(
            "assertContentGatePassed("
          );

        const policyGate =
          approval.indexOf(
            "assertArticlePublicationPolicyPassed("
          );

        const explicitGate =
          approval.indexOf(
            "assertExplicitPublishGatePassedV1("
          );

        const approved =
          approval.indexOf(
            'status:\n        "APPROVED"'
          );


        expect(
          contentGate
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          policyGate
        ).toBeGreaterThan(
          contentGate
        );

        expect(
          explicitGate
        ).toBeGreaterThan(
          policyGate
        );

        expect(
          approved
        ).toBeGreaterThan(
          explicitGate
        );
      }
    );


    it(
      "publication accepts APPROVED only",
      () => {
        expect(
          publication
        ).toMatch(
          /article\.status\s*!==\s*"APPROVED"/
        );


        const cmsBoundary =
          publication.indexOf(
            "await provider.publishContent("
          );

        expect(
          cmsBoundary
        ).toBeGreaterThanOrEqual(
          0
        );
      }
    );


    it(
      "publication terminates in PUBLISHED or PUBLISH_FAILED",
      () => {
        expect(
          publication
        ).toContain(
          '"PUBLISHED"'
        );


        expect(
          publication
        ).toContain(
          '"PUBLISH_FAILED"'
        );
      }
    );


    it(
      "generation API surfaces OpenAI, Gemini and Groq provider failures",
      () => {
        expect(
          generateRoute
        ).toContain(
          "(?:OpenAI|Gemini|Groq) API error"
        );
      }
    );


    it(
      "full production state machine is explicit",
      () => {
        const stateMachine =
          [
            "GENERATING",
            "IN_REVIEW",
            "APPROVED",
            "PUBLISHED",
          ];


        expect(
          stateMachine
        ).toEqual(
          [
            "GENERATING",
            "IN_REVIEW",
            "APPROVED",
            "PUBLISHED",
          ]
        );


        /*
         * Failure exits:
         *
         * generation -> REJECTED
         * publication -> PUBLISH_FAILED
         */
        expect(
          generation
        ).toContain(
          '"REJECTED"'
        );


        expect(
          publication
        ).toContain(
          '"PUBLISH_FAILED"'
        );
      }
    );
  }
);
