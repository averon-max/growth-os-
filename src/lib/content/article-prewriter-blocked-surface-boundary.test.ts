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


const route =
  readFileSync(
    join(
      process.cwd(),
      "src/app/api/content/briefs/[id]/generate-article/route.ts"
    ),
    "utf8"
  );


describe(
  "Pre-writer evidence blocker surface",
  () => {
    it(
      "maps the gate error to a non-article 409 before the generic provider handling",
      () => {
        const gate =
          route.indexOf(
            "err instanceof\n        ArticlePreWriterEvidenceGateErrorV1"
          );

        const provider =
          route.indexOf(
            "const providerMessage ="
          );

        expect(gate).toBeGreaterThanOrEqual(0);
        expect(provider).toBeGreaterThan(gate);

        const block =
          route.slice(gate, provider);

        expect(block).toContain("articleCreated:");
        expect(block).toMatch(/status:\s*409/);
        expect(block).not.toContain("REJECTED");
        expect(block).not.toContain("contentArticle");
      }
    );
  }
);
