import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  new URL("./service.ts", import.meta.url),
  "utf8"
);

describe("Brief pre-persist answer support V1", () => {
  it("checks all PreWriter gates before generating or saving a Brief", () => {
    const start = service.indexOf(
      "BRIEF_PRE_PERSIST_ANSWER_SUPPORT_GATE_V1"
    );
    const create = service.indexOf(
      "await prisma.contentBrief.create", start
    );
    const generate = service.indexOf(
      "await generator.generateBrief", start
    );

    expect(start).toBeGreaterThan(-1);
    expect(generate).toBeGreaterThan(start);
    expect(create).toBeGreaterThan(generate);

    const block = service.slice(start, generate);

    expect(block).toContain(
      "assertArticlePreWriterEvidenceReadyV1"
    );
    expect(block).toContain(
      "assertArticlePreWriterRequiredCoverageV1"
    );
    expect(block).toContain(
      "assertArticlePreWriterAnswerSupportV2"
    );
  });
});
