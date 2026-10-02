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


const start =
  service.indexOf(
    "export async function generateArticleFromBrief("
  );

const end =
  service.indexOf(
    "export async function approveArticle(",
    start
  );

const generation =
  service.slice(
    start,
    end
  );


describe(
  "Master post-writer authority V1",
  () => {
    it(
      "keeps Master Writer and Master critic authority",
      () => {
        expect(
          generation
        ).toContain(
          "executeMasterWriterV1("
        );

        expect(
          generation
        ).toContain(
          "executeMasterArticleCriticRepairReplayV1"
        );
      }
    );


    it(
      "keeps Competitive SERP Replay",
      () => {
        expect(
          generation
        ).toContain(
          "executeCompetitiveSerpReplayRepairV2"
        );
      }
    );


    it(
      "never runs legacy critiqueArticle after Master Writer",
      () => {
        expect(
          generation
        ).toContain(
          "MASTER_WRITER_LEGACY_REVIEW_BYPASS_V1"
        );

        expect(
          generation
        ).not.toContain(
          ".critiqueArticle("
        );

        expect(
          generation
        ).not.toContain(
          "supportsArticleReviewGenerator("
        );
      }
    );


    it(
      "never re-enables legacy whole-article rewrite",
      () => {
        expect(
          generation
        ).not.toContain(
          "allowLegacyWholeArticleRewrite"
        );

        expect(
          generation
        ).not.toContain(
          ".rewriteArticle("
        );
      }
    );


    it(
      "preserves Final Readiness lifecycle authority",
      () => {
        expect(
          generation
        ).toContain(
          '"IN_REVIEW"'
        );

        expect(
          generation
        ).toContain(
          "REJECTED_RECOVERY_PERSISTENCE_V1"
        );

        expect(
          generation
        ).not.toContain(
          'status:\n          "APPROVED"'
        );
      }
    );
  }
);
