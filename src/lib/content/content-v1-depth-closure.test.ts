import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1,
  deriveSectionBudgetsForLengthContractV1,
  resolveArticleLengthContractV1,
} from "./article-length-contract-v1";

import { buildSectionDepthRepairRequirementV1 } from "./master-section-repair";

import { classifyRejectedRecoveryV1 } from "./rejected-recovery-v1";

describe("Content V1 final depth closure", () => {
  it("allocates comprehensive section floors to the full article contract", () => {
    const sections = [
      {
        id: "s1",
        state: "WRITABLE",
        targetWords: {
          min: 90,
          preferred: 160,
          max: 220,
        },
      },
      {
        id: "s2",
        state: "WRITABLE",
        targetWords: {
          min: 100,
          preferred: 210,
          max: 285,
        },
      },
      {
        id: "s3",
        state: "WRITABLE",
        targetWords: {
          min: 110,
          preferred: 250,
          max: 340,
        },
      },
      {
        id: "s4",
        state: "WRITABLE",
        targetWords: {
          min: 100,
          preferred: 190,
          max: 255,
        },
      },
      {
        id: "s5",
        state: "WRITABLE",
        targetWords: {
          min: 90,
          preferred: 150,
          max: 205,
        },
      },
    ] as const;

    const contract = resolveArticleLengthContractV1({
      intent: "INFORMATIONAL",

      pageType: "GUIDE",
    });

    const budgets = deriveSectionBudgetsForLengthContractV1(sections, contract);

    const values = sections.map((section) => {
      const value = budgets.get(section.id);

      expect(value).toBeDefined();

      return value!;
    });

    expect(values.reduce((sum, value) => sum + value.min, 0)).toBe(
      COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.min,
    );

    expect(values.reduce((sum, value) => sum + value.preferred, 0)).toBe(
      Math.round(
        (COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.min +
          COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.max) /
          2,
      ),
    );

    expect(values.reduce((sum, value) => sum + value.max, 0)).toBe(
      COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.max,
    );
  });

  it("detects an under-depth section but accepts one at the plan floor", () => {
    const targetWords = {
      min: 300,

      preferred: 360,

      max: 430,
    };

    const short = buildSectionDepthRepairRequirementV1({
      targetWords,

      bodyMarkdown: Array(120).fill("useful").join(" "),
    });

    expect(short).toMatchObject({
      currentWords: 120,

      minWords: 300,

      preferredWords: 360,

      maxWords: 430,
    });

    const complete = buildSectionDepthRepairRequirementV1({
      targetWords,

      bodyMarkdown: Array(300).fill("useful").join(" "),
    });

    expect(complete).toBeNull();
  });

  it("persists exhausted depth repair as a dedicated failure class", () => {
    expect(
      classifyRejectedRecoveryV1(
        new Error("SECTION_TARGETED_REPAIR_EXHAUSTED:DEPTH:220<350"),
      ),
    ).toMatchObject({
      failureClass: "DEPTH_FAILURE",

      owner: "DEPTH",

      nextAction: "REPAIR_OWNING_STAGE",

      autoRetryAllowed: false,
    });
  });

  it("wires depth into the existing targeted repair instead of adding another writer", () => {
    const repair = readFileSync(
      new URL("./master-section-repair.ts", import.meta.url),
      "utf8",
    );

    const prompt = readFileSync(
      new URL("./master-section-repair-prompt.ts", import.meta.url),
      "utf8",
    );

    expect(repair).toContain('"DEPTH"');

    expect(repair).toContain("buildSectionDepthRepairRequirementV1({");

    expect(repair).toContain("SECTION_TARGETED_REPAIR_EXHAUSTED");

    expect(prompt).toContain("DEPTH COMPLETENESS REPAIR");

    expect(prompt).toContain("Do not use filler");

    expect(repair).not.toContain("rewriteWholeArticle");


    // DEPTH_MODEL_REPAIR_WIRING_V1 regression
    //
    // Presence of a DEPTH error code is not enough.
    // Pure under-depth must route through the ONE existing
    // bounded section repair call before the terminal gate.
    expect(repair).toMatch(
      /trigger\s*===\s*"RECONCILIATION"[\s\S]{0,160}trigger\s*===\s*"DEPTH"/
    );

    expect(repair).toMatch(
      /repairSection\s*\(\s*\{[\s\S]{0,1800}?depthRepair\s*:/
    );

    const modelRepairCalls =
      repair.match(
        /\.repairSection\s*\(\s*\{/g
      ) ?? [];

    expect(
      modelRepairCalls.length
    ).toBeGreaterThanOrEqual(
      1
    );

    expect(repair).toContain(
      "SECTION_DEPTH_TERMINAL_GATE_V1"
    );
  });
});
