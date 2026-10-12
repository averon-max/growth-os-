/**
 * READ ONLY: inspect the real persisted evidence authority offered to one
 * section. Does not call the generator, update the DB or perform research.
 *
 * npx tsx scripts/content-section-authority-audit.ts BRIEF_ID SECTION_HEADING
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main(): Promise<void> {
  const briefId = process.argv[2];
  const heading = process.argv[3] ?? "Does Credit Monitoring Affect Your Credit Score?";
  if (!briefId || !/^[a-zA-Z0-9_-]{1,100}$/.test(briefId)) {
    throw new Error("USAGE: tsx scripts/content-section-authority-audit.ts BRIEF_ID [SECTION_HEADING]");
  }

  const { prisma } = await import("../src/lib/prisma");
  try {
    const snapshot = await prisma.contentEvidenceSnapshot.findUnique({
      where: { briefId },
      select: { plan: true },
    });
    if (!snapshot) throw new Error("BRIEF_EVIDENCE_SNAPSHOT_NOT_FOUND");
    const { inspectMasterRuntimeSnapshot } = await import("../src/lib/content/master-runtime-adapter");
    const inspection = inspectMasterRuntimeSnapshot(snapshot.plan);
    if (!inspection.runtime) throw new Error("PERSISTED_MASTER_RUNTIME_NOT_READY");
    const { buildArticleGenerationContractV1 } = await import("../src/lib/content/article-generation-contract");
    const { buildSectionScopedAuthorityContextV1 } = await import("../src/lib/content/master-section-context");
    const contract = buildArticleGenerationContractV1(inspection.runtime);
    const target = contract.sectionContracts.find(
      section => section.blueprint.heading === heading,
    );
    if (!target) {
      console.log("AVAILABLE_SECTION_HEADINGS:",
        contract.sectionContracts.map(section => section.blueprint.heading));
      throw new Error("TARGET_SECTION_NOT_FOUND_IN_PERSISTED_CONTRACT");
    }
    const projected = buildSectionScopedAuthorityContextV1(target);
    const context = projected as {
      claimLedger?: { claims?: Array<Record<string, unknown>> };
      evidenceGraph?: {
        claimEvidence?: Array<Record<string, unknown>>;
        sources?: Array<Record<string, unknown>>;
      };
    };
    const claims = context.claimLedger?.claims ?? [];
    const evidence = context.evidenceGraph?.claimEvidence ?? [];
    const sources = context.evidenceGraph?.sources ?? [];

    console.log("=== PERSISTED SECTION AUTHORITY — READ ONLY ===");
    console.log("BRIEF:", briefId);
    console.log("SECTION_INDEX:", target.sectionIndex);
    console.log("HEADING:", target.blueprint.heading);
    console.log("MISSION:", target.blueprint.mission);
    console.log("REQUIRED_CLAIM_IDS:", JSON.stringify(target.blueprint.requiredClaims));
    console.log("ASSIGNED_EVIDENCE_IDS:", JSON.stringify(target.blueprint.evidenceIds));
    console.log("SCOPED_CLAIMS:", claims.length);
    for (const claim of claims) {
      console.log("CLAIM:", JSON.stringify({
        id: claim.id,
        text: claim.text,
        status: claim.status,
        evidenceIds: claim.evidenceIds,
      }));
    }
    console.log("SCOPED_EVIDENCE:", evidence.length);
    for (const entry of evidence) {
      console.log("EVIDENCE:", JSON.stringify({
        id: entry.id,
        claimId: entry.claimId,
        relation: entry.relation,
        kind: entry.kind,
        sourceId: entry.sourceId,
        excerpt: entry.excerpt,
      }));
    }
    console.log("SCOPED_SOURCES:", sources.length);
    for (const source of sources) {
      console.log("SOURCE:", JSON.stringify({
        id: source.id,
        url: source.url,
        publisher: source.publisher,
        jurisdiction: source.jurisdiction,
      }));
    }
    console.log("READ_ONLY; NO_MODEL_CALLS; DATABASE_UNCHANGED");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error("SECTION_AUTHORITY_AUDIT_FAILED:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
