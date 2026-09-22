import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const source =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


function functionSource(
  startToken:
    string,
  endToken?:
    string
): string {
  const start =
    source.indexOf(
      startToken
    );


  if (
    start < 0
  ) {
    throw new Error(
      `Missing function token: ${startToken}`
    );
  }


  const end =
    endToken
      ? source.indexOf(
          endToken,
          start
        )
      : source.length;


  if (
    endToken &&
    end < 0
  ) {
    throw new Error(
      `Missing end token: ${endToken}`
    );
  }


  return source.slice(
    start,
    end
  );
}


describe(
  "Stage 9L production publish gate boundary",
  () => {
    it(
      "uses one shared explicit gate contract for approve and publish",
      () => {
        expect(
          source.match(
            /evaluateExplicitPublishGateV1\(\{/g
          ) ??
          []
        ).toHaveLength(
          2
        );


        expect(
          source.match(
            /assertExplicitPublishGatePassedV1\(/g
          ) ??
          []
        ).toHaveLength(
          2
        );
      }
    );


    it(
      "runs after existing gates and before APPROVED",
      () => {
        const approve =
          functionSource(
            "export async function approveArticle(",
            "export async function publishArticle("
          );


        const content =
          approve.indexOf(
            "assertContentGatePassed("
          );

        const policy =
          approve.indexOf(
            "assertArticlePublicationPolicyPassed("
          );

        const explicit =
          approve.indexOf(
            "evaluateExplicitPublishGateV1({"
          );

        const approved =
          approve.indexOf(
            'status:\n        "APPROVED"'
          );


        expect(
          content
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          policy
        ).toBeGreaterThan(
          content
        );

        expect(
          explicit
        ).toBeGreaterThan(
          policy
        );

        expect(
          approved
        ).toBeGreaterThan(
          explicit
        );
      }
    );


    it(
      "runs after existing gates and immediately before CMS publication boundary",
      () => {
        const publish =
          functionSource(
            "export async function publishArticle("
          );


        const content =
          publish.indexOf(
            "assertContentGatePassed("
          );

        const policy =
          publish.indexOf(
            "assertArticlePublicationPolicyPassed("
          );

        const explicit =
          publish.indexOf(
            "evaluateExplicitPublishGateV1({"
          );

        const cms =
          publish.indexOf(
            "await provider.publishContent("
          );


        expect(
          content
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          policy
        ).toBeGreaterThan(
          content
        );

        expect(
          explicit
        ).toBeGreaterThan(
          policy
        );

        expect(
          cms
        ).toBeGreaterThan(
          explicit
        );
      }
    );


    it(
      "loads persisted replay artifacts instead of recomputing SERP Replay",
      () => {
        const approve =
          functionSource(
            "export async function approveArticle(",
            "export async function publishArticle("
          );

        const publish =
          functionSource(
            "export async function publishArticle("
          );


        expect(
          approve
        ).toContain(
          "prisma.serpReplayArtifact.findFirst({"
        );

        expect(
          publish
        ).toContain(
          "prisma.serpReplayArtifact.findFirst({"
        );


        expect(
          approve
        ).not.toContain(
          "executeSerpReplayV1("
        );

        expect(
          publish
        ).not.toContain(
          "executeSerpReplayV1("
        );
      }
    );


    it(
      "uses the newest artifact deterministically",
      () => {
        const approve =
          functionSource(
            "export async function approveArticle(",
            "export async function publishArticle("
          );


        expect(
          approve
        ).toContain(
          'createdAt:\n            "desc"'
        );

        expect(
          approve
        ).toContain(
          'id:\n            "desc"'
        );
      }
    );


    it(
      "does not introduce ranking score or ranking probability",
      () => {
        const gate =
          readFileSync(
            new URL(
              "./publish-gate.ts",
              import.meta.url
            ),
            "utf8"
          );


        expect(
          gate
        ).not.toContain(
          "rankingScore"
        );

        expect(
          gate
        ).not.toContain(
          "rankingProbability"
        );

        expect(
          gate
        ).not.toContain(
          "chanceToRank"
        );
      }
    );


    it(
      "does not regenerate or rewrite article content",
      () => {
        const gate =
          readFileSync(
            new URL(
              "./publish-gate.ts",
              import.meta.url
            ),
            "utf8"
          );


        expect(
          gate
        ).not.toContain(
          "generateArticle("
        );

        expect(
          gate
        ).not.toContain(
          "rewriteArticle("
        );

        expect(
          gate
        ).not.toContain(
          "repairSection("
        );
      }
    );
  }
);
