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


describe(
  "post-Writer checkpoint order V2",
  () => {
    it(
      "persists Writer output before every master critic stage",
      () => {
        const writer =
          source.indexOf(
            "const masterWriterRun ="
          );

        const checkpoint =
          source.indexOf(
            "POST_WRITER_ARTICLE_CHECKPOINT_V1",
            writer
          );

        const criticContext =
          source.indexOf(
            "buildMasterArticleSemanticCriticContextV1(",
            writer
          );

        const firstCritic =
          source.indexOf(
            "executeMasterArticleCriticsV1({",
            writer
          );


        expect(
          writer
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          checkpoint
        ).toBeGreaterThan(
          writer
        );

        expect(
          criticContext
        ).toBeGreaterThan(
          checkpoint
        );

        expect(
          firstCritic
        ).toBeGreaterThan(
          checkpoint
        );
      }
    );


    it(
      "persists the raw completed Master Writer article, not a post-critic projection",
      () => {
        const checkpoint =
          source.indexOf(
            "POST_WRITER_ARTICLE_CHECKPOINT_V1"
          );

        const window =
          source.slice(
            checkpoint,
            checkpoint + 2200
          );


        expect(
          window
        ).toContain(
          "masterWriterRun"
        );

        expect(
          window
        ).toContain(
          ".article"
        );

        expect(
          window
        ).toContain(
          ".bodyMarkdown"
        );

        expect(
          window
        ).not.toContain(
          "acceptedMasterWriterRun"
        );
      }
    );
  }
);
