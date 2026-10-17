import { it, expect } from "vitest";
import { prisma } from "../prisma";
import {
  inspectMasterRuntimeSnapshot,
} from "./master-runtime-adapter";
import { writeFileSync, mkdirSync } from "node:fs";

it("extracts actual evidence for historical article recovery", async () => {
  const article = await prisma.contentArticle.findUnique({
    where: {
      id: "cmv1hjtyv06s7oaql3hgxdkxz",
    },
    include: {
      brief: {
        include: {
          evidenceSnapshot: true,
        },
      },
    },
  });

  expect(article).not.toBeNull();
  if (!article) return;

  const inspection = inspectMasterRuntimeSnapshot(
    article.brief.evidenceSnapshot?.plan
  );

  expect(inspection.readiness).toBe("READY");
  if (!inspection.runtime) return;

  const { claimLedger, evidenceGraph } = inspection.runtime;

  const report = claimLedger.claims.map(claim => ({
    claimId: claim.id,
    text: claim.text,
    status: claim.status,
    evidence: evidenceGraph.claimEvidence
      .filter(e => e.claimId === claim.id)
      .map(e => ({
        sourceId: e.sourceId,
        relation: e.relation,
        kind: e.kind,
        excerpt: e.excerpt,
      })),
  }));

  const output =
    ".growth-os-tmp/article-recovery/claim-support-report.json";

  mkdirSync(".growth-os-tmp/article-recovery", {
    recursive: true,
  });

  writeFileSync(output, JSON.stringify({
    articleId: article.id,
    claims: report,
  }, null, 2));

  console.log("CLAIM_SUPPORT_REPORT:", output);
  console.log("CLAIMS:", report.length);
  console.log("DATABASE_UNCHANGED");

  expect(report.length).toBeGreaterThan(0);
}, 15000);
