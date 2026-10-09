import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import {
  normalizeGeneratedSectionCandidateV1,
} from "./section-candidate-normalization-v1";


const contract =
  {
    blueprint: {
      heading:
        "Can Someone Check Your Credit Without You Knowing?",
    },
  } as unknown as
    SectionGenerationContractV1;


describe(
  "section provider canonical H2 normalization V1",
  () => {
    it(
      "removes an exact duplicate canonical H2 only when it is the first line",
      () => {
        const result =
          normalizeGeneratedSectionCandidateV1({
            contract,

            candidate: {
              bodyMarkdown:
                "## Can Someone Check Your Credit Without You Knowing?\n\nUseful body text.",
            },
          });

        expect(
          result.bodyMarkdown
        ).toBe(
          "Useful body text."
        );
      }
    );


    it(
      "demotes a different model-authored H2 to H3",
      () => {
        const result =
          normalizeGeneratedSectionCandidateV1({
            contract,

            candidate: {
              bodyMarkdown:
                "## Different Heading\n\nUseful body text.",
            },
          });

        expect(
          result.bodyMarkdown
        ).toBe(
          "### Different Heading\n\nUseful body text."
        );
      }
    );


    it(
      "demotes later H2 headings instead of allowing section ownership drift",
      () => {
        const result =
          normalizeGeneratedSectionCandidateV1({
            contract,

            candidate: {
              bodyMarkdown:
                "Intro text.\n\n## Can Someone Check Your Credit Without You Knowing?\n\nMore text.",
            },
          });

        expect(
          result.bodyMarkdown
        ).toBe(
          "Intro text.\n\n### Can Someone Check Your Credit Without You Knowing?\n\nMore text."
        );
      }
    );


    it(
      "demotes multiple H2 headings while preserving their text",
      () => {
        const result =
          normalizeGeneratedSectionCandidateV1({
            contract,

            candidate: {
              bodyMarkdown:
                "Intro.\n\n## First Detail\n\nText.\n\n## Second Detail\n\nMore text.",
            },
          });

        expect(
          result.bodyMarkdown
        ).toBe(
          "Intro.\n\n### First Detail\n\nText.\n\n### Second Detail\n\nMore text."
        );
      }
    );
  }
);
