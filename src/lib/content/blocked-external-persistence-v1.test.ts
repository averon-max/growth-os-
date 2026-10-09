import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  classifyRejectedRecoveryV1,
} from "./rejected-recovery-v1";


const schema =
  readFileSync(
    new URL(
      "../../../prisma/schema.prisma",
      import.meta.url
    ),
    "utf8"
  );


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "blocked external persistence V1",
  () => {
    it(
      "classifies generic OpenAI SDK Connection error as transport",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "OpenAI API error unknown: Connection error."
            )
          )
        ).toMatchObject({
          failureClass:
            "INFRA_FAILURE",

          owner:
            "TRANSPORT",

          nextAction:
            "RETRY_TRANSPORT",

          autoRetryAllowed:
            true,
        });
      }
    );


    it(
      "preserves transport classification through critic wrapper",
      () => {
        expect(
          classifyRejectedRecoveryV1(
            new Error(
              "MASTER_ARTICLE_SEMANTIC_CRITIC_EXECUTION_FAILED:OpenAI API error unknown: Connection error."
            )
          )
        ).toMatchObject({
          failureClass:
            "INFRA_FAILURE",

          owner:
            "TRANSPORT",

          autoRetryAllowed:
            true,
        });
      }
    );


    it(
      "has a real blocked external article status",
      () => {
        expect(
          schema
        ).toContain(
          "BLOCKED_EXTERNAL"
        );
      }
    );


    it(
      "persists transport outages as BLOCKED_EXTERNAL instead of REJECTED",
      () => {
        const catchStart =
          service.indexOf(
            "REJECTED_RECOVERY_PERSISTENCE_V1"
          );

        const catchEnd =
          service.indexOf(
            "export async function approveArticle",
            catchStart
          );

        const window =
          service.slice(
            catchStart,
            catchEnd
          );

        expect(
          window
        ).toContain(
          '"TRANSPORT"'
        );

        expect(
          window
        ).toContain(
          '"BLOCKED_EXTERNAL"'
        );

        expect(
          window
        ).toMatch(
          /recovery\.owner\s*===\s*"TRANSPORT"[\s\S]*\?\s*"BLOCKED_EXTERNAL"[\s\S]*:\s*"REJECTED"/
        );
      }
    );


    it(
      "reuses BLOCKED_EXTERNAL as the same logical article on retry",
      () => {
        const start =
          service.indexOf(
            "REJECTED_RETRY_REUSES_LOGICAL_ARTICLE_V1"
          );

        const end =
          service.indexOf(
            "const pendingArticle",
            start
          );

        const window =
          service.slice(
            start,
            end
          );

        expect(
          window
        ).toContain(
          '"REJECTED"'
        );

        expect(
          window
        ).toContain(
          '"BLOCKED_EXTERNAL"'
        );
      }
    );
  }
);
