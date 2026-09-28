import {
  describe,
  expect,
  it,
} from "vitest";

import fs from "node:fs";
import path from "node:path";


describe(
  "Master Article Semantic Critic provider boundary",
  () => {
    const source =
      fs.readFileSync(
        path.join(
          process.cwd(),
          "src/lib/content/master-article-semantic-critic-prompt.ts"
        ),
        "utf8"
      );


    it(
      "uses the critic budget serializer",
      () => {
        expect(
          source
        ).toContain(
          "serializeMasterArticleSemanticCriticBudgetV1"
        );
      }
    );


    it(
      "does not serialize the complete runtime tuple directly",
      () => {
        expect(
          source
        ).not.toMatch(
          /JSON\.stringify\([\s\S]{0,800}contract[\s\S]{0,800}run[\s\S]{0,800}context/
        );
      }
    );
  }
);
