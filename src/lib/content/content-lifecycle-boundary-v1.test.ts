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


function serviceSection(
  from:
    string,
  to?:
    string
): string {
  const start =
    service.indexOf(
      from
    );

  expect(
    start
  ).toBeGreaterThanOrEqual(
    0
  );


  if (!to) {
    return service.slice(
      start
    );
  }


  const end =
    service.indexOf(
      to,
      start +
        from.length
    );

  expect(
    end
  ).toBeGreaterThan(
    start
  );


  return service.slice(
    start,
    end
  );
}


describe(
  "Content lifecycle boundary V1",
  () => {
    it(
      "never deletes a failed generation attempt",
      () => {
        const generation =
          serviceSection(
            "export async function generateArticleFromBrief(",
            "export async function approveArticle("
          );


        expect(
          generation
        ).toContain(
          "REJECTED_RECOVERY_PERSISTENCE_V1"
        );


        expect(
          generation
        ).not.toContain(
          "prisma.contentArticle.delete("
        );


        expect(
          generation
        ).toContain(
          '"REJECTED"'
        );
      }
    );


    it(
      "bubbles only classifier-approved retryable failures",
      () => {
        const generation =
          serviceSection(
            "export async function generateArticleFromBrief(",
            "export async function approveArticle("
          );


        expect(
          generation
        ).toContain(
          "recovery.autoRetryAllowed"
        );


        expect(
          generation
        ).toContain(
          "throw error;"
        );
      }
    );


    it(
      "approves IN_REVIEW only",
      () => {
        const approve =
          serviceSection(
            "export async function approveArticle(",
            "export async function publishArticle("
          );


        expect(
          approve
        ).toContain(
          'article.status !==\n      "IN_REVIEW"'
        );


        expect(
          approve
        ).not.toMatch(
          /article\.status\s*!==\s*"DRAFT"\s*&&/
        );
      }
    );


    it(
      "publishes APPROVED only",
      () => {
        const publish =
          serviceSection(
            "export async function publishArticle("
          );


        expect(
          publish
        ).toMatch(
          /article\.status\s*!==\s*"APPROVED"/
        );


        expect(
          publish
        ).toContain(
          '"PUBLISHED"'
        );


        expect(
          publish
        ).toContain(
          '"PUBLISH_FAILED"'
        );
      }
    );
  }
);
