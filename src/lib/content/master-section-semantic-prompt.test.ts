import {
  describe,
  expect,
  it,
} from "vitest";

import type {
  SectionGenerationContractV1,
} from "./article-generation-contract";

import type {
  GeneratedSectionV1,
} from "./master-article-generator";

import {
  buildMasterSectionSemanticVerificationPrompt,
} from "./master-section-semantic-prompt";


const contract = {
  version:
    "SECTION_GENERATION_CONTRACT_V1",

  sectionIndex:
    0,

  sectionNumber:
    1,

  totalSections:
    1,

  blueprint: {
    heading:
      "Section",

    mission:
      "Explain the fact.",

    requiredClaims: [
      "claim-1",
    ],

    forbiddenClaims: [
      "claim-2",
    ],

    evidenceIds: [
      "ev-1",
    ],
  },

  claimLedger: {
    claims: [
      {
        id:
          "claim-1",

        text:
          "Approved factual claim.",

        status:
          "VERIFIED",
      },

      {
        id:
          "claim-2",

        text:
          "Forbidden claim.",

        status:
          "CONTRADICTED",
      },
    ],
  },

  evidenceGraph: {
    claimEvidence: [
      {
        id:
          "ev-1",

        claimId:
          "claim-1",

        sourceId:
          "source-1",

        relation:
          "SUPPORTS",

        kind:
          "VERIFIED_EXCERPT",

        excerpt:
          "Verified evidence.",
      },
    ],

    sources: [
      {
        id:
          "source-1",

        publisher:
          "Publisher",
      },
    ],
  },
} as unknown as
  SectionGenerationContractV1;


const section = {
  version:
    "GENERATED_SECTION_V1",

  bodyMarkdown:
    "Approved factual claim. A transition follows.",

  provenance: {
    sectionIndex:
      0,
  },
} as unknown as
  GeneratedSectionV1;


describe(
  "Master Section Semantic Verification Prompt",
  () => {
    it(
      "minifies provider context without removing factual evidence",
      () => {
        const prompt =
          buildMasterSectionSemanticVerificationPrompt({
            contract,
            section,
          });

        const context = prompt
          .split("AUTHORITATIVE CONTEXT:")[1]
          ?.trimStart()
          .split(/\r?\n/)[0];

        expect(context).toBeDefined();

        const parsed = JSON.parse(context!);

        expect(context).toBe(JSON.stringify(parsed));

        expect(parsed.section.requiredClaims).toEqual([
          "claim-1",
        ]);

        expect(parsed.section.forbiddenClaims).toEqual([
          "claim-2",
        ]);

        expect(parsed.claims.map((x: { id: string }) => x.id))
          .toEqual(["claim-1", "claim-2"]);

        expect(parsed.evidence[0].id).toBe("ev-1");
        expect(parsed.evidence[0].kind)
          .toBe("VERIFIED_EXCERPT");
        expect(parsed.sources[0].id).toBe("source-1");

        expect(
          parsed.proseUnits.map((x: { id: string }) => x.id)
        ).toEqual([
          "section-0-unit-0",
          "section-0-unit-1",
        ]);

        expect(context!.length).toBeLessThan(
          JSON.stringify(parsed, null, 2).length
        );
      }
    );

    it(
      "requires classification of every deterministic prose unit",
      () => {
        const prompt =
          buildMasterSectionSemanticVerificationPrompt({
            contract,
            section,
          });

        expect(
          prompt
        ).toContain(
          "section-0-unit-0"
        );

        expect(
          prompt
        ).toContain(
          "section-0-unit-1"
        );

        expect(
          prompt
        ).toContain(
          "You may not omit a prose unit."
        );
      }
    );


    it(
      "contains only authoritative section claim/evidence context",
      () => {
        const prompt =
          buildMasterSectionSemanticVerificationPrompt({
            contract,
            section,
          });

        expect(
          prompt
        ).toContain(
          "claim-1"
        );

        expect(
          prompt
        ).toContain(
          "claim-2"
        );

        expect(
          prompt
        ).toContain(
          "ev-1"
        );

        expect(
          prompt
        ).toContain(
          "VERIFIED_EXCERPT"
        );
      }
    );


    it(
      "forbids general-knowledge rescue and invented evidence",
      () => {
        const prompt =
          buildMasterSectionSemanticVerificationPrompt({
            contract,
            section,
          });

        expect(
          prompt
        ).toContain(
          "Do not rescue it using general knowledge."
        );

        expect(
          prompt
        ).toContain(
          "Do NOT invent facts, claims, sources, evidence, IDs, or citations."
        );
      }
    );


    it(
      "requires exact semantic classifications instead of lexical overlap",
      () => {
        const prompt =
          buildMasterSectionSemanticVerificationPrompt({
            contract,
            section,
          });

        expect(
          prompt
        ).toContain(
          "Evaluate the exact meaning of the prose, not keyword overlap."
        );

        expect(
          prompt
        ).toContain(
          "UNSUPPORTED"
        );

        expect(
          prompt
        ).toContain(
          "CONTRADICTED"
        );

        expect(
          prompt
        ).toContain(
          "NARROWER"
        );
      }
    );
  }
);
