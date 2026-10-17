import { it, expect } from "vitest";
import { prisma } from "../prisma";
import { readFileSync, writeFileSync } from "node:fs";
import {
  inspectMasterRuntimeSnapshot,
} from "./master-runtime-adapter";
import {
  buildArticleGenerationContractV1,
} from "./article-generation-contract";
import {
  bindArticleExecutionPlanToGenerationContractV1,
  parsePersistedArticleExecutionPlanV1,
} from "./article-execution-plan-binding-v1";

it("produces an evidence-aware historical article decision", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: { id: "cmv1hjtyv06s7oaql3hgxdkxz" },
    include: {
      brief: { include: { evidenceSnapshot: true } },
    },
  });

  expect(article).not.toBeNull();
  if (!article) return;

  const raw = article.brief.evidenceSnapshot?.plan;
  const inspection = inspectMasterRuntimeSnapshot(raw);

  if (!inspection.runtime || inspection.readiness !== "READY") {
    throw new Error(
      `MASTER_RUNTIME_INVALID:${inspection.blockers.join(",")}`
    );
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("PERSISTED_PLAN_MISSING");
  }

  const stored = raw as Record<string, unknown>;
  const executionPlan = parsePersistedArticleExecutionPlanV1(
    stored.articleExecutionPlan
  );

  const contract = bindArticleExecutionPlanToGenerationContractV1({
    plan: executionPlan,
    contract: buildArticleGenerationContractV1(inspection.runtime),
  });

  const candidate = readFileSync(
    ".growth-os-tmp/article-recovery/final-candidate.md",
    "utf8"
  );

  const keywords = [
    article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords,
  ];

  const prose = candidate
    .split(/\r?\n/)
    .filter(line => !/^#{1,6}\s+/.test(line.trim()))
    .join("\n")
    .toLowerCase();

  const missingKeywords = keywords.filter(
    keyword => !prose.includes(keyword.toLowerCase())
  );

  const headings = candidate
    .split(/\r?\n/)
    .filter(line => /^##\s+/.test(line))
    .map(line => line.replace(/^##\s+/, "").trim());

  const expectedHeadings = contract.sectionContracts.map(
    section => section.blueprint.heading
  );

  const structuralMatch =
    JSON.stringify(headings) === JSON.stringify(expectedHeadings);

  const claims = inspection.runtime.claimLedger.claims;
  const evidence = inspection.runtime.evidenceGraph.claimEvidence;

  const unsupportedClaims = claims
    .filter(claim => !evidence.some(
      item =>
        item.claimId === claim.id &&
        item.relation === "SUPPORTS" &&
        item.kind === "VERIFIED_EXCERPT"
    ))
    .map(claim => claim.id);

  const blockers: string[] = [];

  if (!structuralMatch) {
    blockers.push("SECTION_STRUCTURE_MISMATCH");
  }

  if (missingKeywords.length) {
    blockers.push("PLANNED_KEYWORD_MISSING");
  }

  if (unsupportedClaims.length) {
    blockers.push("CLAIM_EVIDENCE_LINK_MISSING");
  }

  // Historical run was not persisted. Never fabricate
  // reconciliation, semantic verification or final critics.
  blockers.push("HISTORICAL_MASTER_WRITER_RUN_MISSING");
  blockers.push("FINAL_SEMANTIC_REVALIDATION_REQUIRED");
  blockers.push("FINAL_READINESS_NOT_EXECUTED");

  const decision = {
    version: "HISTORICAL_ARTICLE_FINAL_DECISION_V1",
    articleId: article.id,
    databaseStatus: article.status,
    candidateWords: candidate.trim().split(/\s+/).length,
    contractSections: expectedHeadings.length,
    structuralMatch,
    plannedKeywords: keywords.length,
    missingKeywords,
    ledgerClaims: claims.length,
    claimsWithoutVerifiedExcerptLink: unsupportedClaims,
    evidenceSemanticAdequacyVerified: false,
    blockers,
    decision: "HOLD_FOR_VERIFIED_RECOVERY",
    mayEnterInReview: false,
    databaseModified: false,
  };

  const filename =
    ".growth-os-tmp/article-recovery/final-decision.json";

  writeFileSync(filename, JSON.stringify(decision, null, 2));

  console.log("=== FINAL ARTICLE DECISION ===");
  console.log(JSON.stringify(decision, null, 2));

  expect(structuralMatch).toBe(true);
  expect(missingKeywords).toEqual([]);
}, 15000);
