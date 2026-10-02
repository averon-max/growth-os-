import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildSectionScopedAuthorityContextV1,
} from "./master-section-context";

import {
  buildMasterSectionRepairPrompt,
} from "./master-section-repair-prompt";


const contract = {
  sectionIndex: 0,
  sectionNumber: 1,
  totalSections: 2,
  blueprint: {
    heading: "Section X",
    mission: "Explain X.",
    requiredClaims: ["claim-x"],
    forbiddenClaims: [],
    evidenceIds: ["ev-x"],
  },
  hardRules: {},
  claimLedger: {
    claims: [
      { id: "claim-x", text: "X fact.", evidenceIds: ["ev-x"] },
      { id: "claim-y", text: "Y fact.", evidenceIds: ["ev-y"] },
    ],
  },
  evidenceGraph: {
    sources: [
      { id: "src-x", url: "https://example.com/x" },
      { id: "src-y", url: "https://example.com/y" },
    ],
    claimEvidence: [
      { id: "ev-x", claimId: "claim-x", sourceId: "src-x", relation: "SUPPORTS", kind: "VERIFIED_EXCERPT" },
      { id: "ev-y", claimId: "claim-y", sourceId: "src-y", relation: "SUPPORTS", kind: "VERIFIED_EXCERPT" },
    ],
  },
} as never;


describe(
  "Section repair scope isolation",
  () => {
    it(
      "projector exposes section X authority and no section Y ids",
      () => {
        const out = JSON.stringify(
          buildSectionScopedAuthorityContextV1(contract)
        );

        expect(out).toContain("claim-x");
        expect(out).toContain("ev-x");
        expect(out).toContain("src-x");
        expect(out).not.toContain("claim-y");
        expect(out).not.toContain("ev-y");
        expect(out).not.toContain("src-y");
      }
    );


    it(
      "repair prompt for section X never contains section Y ids",
      () => {
        const prompt = buildMasterSectionRepairPrompt({
          attempt: 1,
          contract,
          section: {
            heading: "Section X",
            bodyMarkdown: "Bad sentence.",
            coveredQueryNodeIds: [],
            referencedClaimIds: [],
            referencedEvidenceIds: [],
            usedInternalLinks: [],
            assetUsed: null,
          } as never,
          reconciliation: { status: "BLOCK", findings: [] } as never,
          semanticVerification: null as never,
          depthRepair: null as never,
        });

        expect(prompt).toContain("claim-x");
        expect(prompt).not.toContain("claim-y");
        expect(prompt).not.toContain("ev-y");
        expect(prompt).not.toContain("src-y");
      }
    );
  }
);
