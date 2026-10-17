import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildMasterSectionRepairPrompt,
} from "./master-section-repair-prompt";


describe(
  "Master Section Repair Prompt",
  () => {
    it(
      "preserves only section-owned execution jobs and queries in local repairs",
      () => {
        const prompt = buildMasterSectionRepairPrompt({
          contract: {
            sectionIndex: 0,
            sectionNumber: 1,
            totalSections: 2,
            blueprint: {
              heading: "How credit monitoring alerts work",
              mission: "Explain alert delivery and reader action",
              queryNodeIds: ["query-allowed"],
              requiredClaims: ["claim-allowed"],
              forbiddenClaims: [],
              evidenceIds: ["evidence-allowed"],
              internalLinks: [],
            },
            queryGraph: {
              nodes: [
                {id: "query-allowed", query: "ALLOWED_READER_QUESTION"},
                {id: "query-other", query: "UNASSIGNED_SENSITIVE_QUERY"},
              ],
            },
            claimLedger: {
              claims: [
                {id: "claim-allowed", text: "SUPPORTED_READER_CLAIM"},
                {id: "claim-other", text: "UNASSIGNED_CLAIM"},
              ],
            },
            evidenceGraph: {
              claimEvidence: [
                {id:"evidence-allowed",claimId:"claim-allowed",
                 sourceId:"source-allowed",excerpt:"SUPPORTED_EXCERPT"},
                {id:"evidence-other",claimId:"claim-other",
                 sourceId:"source-other",excerpt:"UNASSIGNED_EXCERPT"},
              ],
              sources: [
                {id:"source-allowed",url:"https://example.com/allowed"},
                {id:"source-other",url:"https://example.com/unassigned"},
              ],
            },
            executionPlanAuthority: {
              requiredQuestions: [
                {id:"reader-question-allowed",label:"FIRST_PARTY_JOB"},
              ],
              targetWords: {min:240,preferred:300,max:420},
            },
            hardRules: {},
          } as never,
          section: {
            heading:"How credit monitoring alerts work",
            bodyMarkdown:"Direct supported explanation.",
            coveredQueryNodeIds:["query-allowed"],
            referencedClaimIds:["claim-allowed"],
            referencedEvidenceIds:["evidence-allowed"],
            usedInternalLinks:[],
            assetUsed:null,
          } as never,
          reconciliation: {
            status:"PASS",
            requiredClaimIds:["claim-allowed"],
            referencedClaimIds:["claim-allowed"],
            referencedEvidenceIds:["evidence-allowed"],
            findings:[],
          } as never,
          semanticVerification:null,
          depthRepair:{
            currentWords:30,minWords:240,preferredWords:300,maxWords:420,
          },
          attempt:1,
        });

        expect(prompt).toContain("executionPlanAuthority");
        expect(prompt).toContain("FIRST_PARTY_JOB");
        expect(prompt).toContain("ALLOWED_READER_QUESTION");
        expect(prompt).toContain("SUPPORTED_EXCERPT");
        expect(prompt).toContain("SECTION JOB CONTINUITY");
        expect(prompt).not.toContain("UNASSIGNED_SENSITIVE_QUERY");
        expect(prompt).not.toContain("UNASSIGNED_CLAIM");
        expect(prompt).not.toContain("UNASSIGNED_EXCERPT");
        expect(prompt).not.toContain("https://example.com/unassigned");
      }
    );

    it(
      "forbids article-wide mutation and invented evidence",
      () => {
        const prompt =
          buildMasterSectionRepairPrompt({
            contract: {
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
                  "Explain.",

                requiredClaims: [
                  "claim-1",
                ],

                forbiddenClaims:
                  [],

                evidenceIds: [
                  "ev-1",
                ],
              },

              hardRules: {},

              claimLedger: {
                claims:
                  [],
              },

              evidenceGraph: {
                sources:
                  [],

                claimEvidence:
                  [],
              },
            } as never,

            section: {
              heading:
                "Section",

              bodyMarkdown:
                "Bad sentence.",

              coveredQueryNodeIds:
                [],

              referencedClaimIds:
                [],

              referencedEvidenceIds:
                [],

              usedInternalLinks:
                [],

              assetUsed:
                null,
            } as never,

            reconciliation: {
              status:
                "BLOCK",
            } as never,

            semanticVerification:
              null,

            attempt:
              1,
          });

        expect(
          prompt
        ).toContain(
          "You are NOT rewriting the article."
        );

        expect(
          prompt
        ).toContain(
          "Do NOT output an H1."
        );

        expect(
          prompt
        ).toContain(
          "Do NOT output an H2."
        );

        expect(
          prompt
        ).toContain(
          "Never invent a fact"
        );

        expect(
          prompt
        ).toContain(
          "remove it or narrow it instead of fabricating support"
        );
      }
    );
  }
);
