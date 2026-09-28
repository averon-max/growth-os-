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


function read(
  path:
    string
) {
  return readFileSync(
    join(
      process.cwd(),
      path
    ),
    "utf8"
  );
}


describe(
  "Outcome Learning DAY 60 boundary",
  () => {
    it(
      "uses DAY_60 in the application schema",
      () => {
        const schema =
          read(
            "prisma/schema.prisma"
          );

        expect(
          schema
        ).toContain(
          "DAY_60"
        );

        expect(
          schema
        ).not.toContain(
          "DAY_56"
        );
      }
    );


    it(
      "schedules the long checkpoint at 60 days",
      () => {
        const source =
          read(
            "src/lib/keywords/outcome-checkpoint-engine.ts"
          );

        expect(
          source
        ).toContain(
          '"DAY_60"'
        );

        expect(
          source
        ).toMatch(
          /60\s*\*\s*DAY_MS/
        );

        expect(
          source
        ).not.toContain(
          '"DAY_56"'
        );
      }
    );


    it(
      "publishes outcome-linked content into the existing execution loop",
      () => {
        const route =
          read(
            "src/app/api/content/articles/[id]/publish/route.ts"
          );

        expect(
          route
        ).toContain(
          'executionKind:'
        );

        expect(
          route
        ).toContain(
          '"CONTENT_PUBLISH"'
        );

        expect(
          route
        ).toContain(
          "contentArticleId:"
        );

        expect(
          route
        ).toContain(
          "updated.id"
        );
      }
    );


    it(
      "keeps the existing checkpoint scheduler",
      () => {
        const route =
          read(
            "src/app/api/internal/outcome-checkpoints/route.ts"
          );

        expect(
          route
        ).toContain(
          "runOutcomeCheckpointEngine"
        );

        expect(
          route
        ).toContain(
          "CRON_SECRET"
        );
      }
    );
  }
);
