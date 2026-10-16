-- Append-only reviewed ownership, without changing signed source plan.
CREATE TABLE "ContentQueryOwnerReview" (
    "id" TEXT NOT NULL,
    "contentArticleId" TEXT NOT NULL,
    "evidenceSnapshotId" TEXT NOT NULL,
    "queryNodeId" TEXT NOT NULL,
    "observedQuery" TEXT NOT NULL,
    "ownerSectionIndex" INTEGER NOT NULL,
    "ownerHeading" TEXT NOT NULL,
    "sourceArticleFingerprint" TEXT NOT NULL,
    "sourceQueryGraphSha256" TEXT NOT NULL,
    "sourceSectionBlueprintSha256" TEXT NOT NULL,
    "sourceExecutionPlanSha256" TEXT NOT NULL,
    "sourceReplayArtifactId" TEXT NOT NULL,
    "decisionVersion" TEXT NOT NULL DEFAULT 'QUERY_OWNER_HUMAN_APPROVAL_V1',
    "decision" TEXT NOT NULL DEFAULT 'APPROVED',
    "reviewerAttestation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentQueryOwnerReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_cqor_article_node_fingerprint_graph"
ON "ContentQueryOwnerReview"("contentArticleId", "queryNodeId", "sourceArticleFingerprint", "sourceQueryGraphSha256");

CREATE INDEX "ix_cqor_article_created"
ON "ContentQueryOwnerReview"("contentArticleId", "createdAt");

ALTER TABLE "ContentQueryOwnerReview"
ADD CONSTRAINT "cqor_article_fk" FOREIGN KEY ("contentArticleId")
REFERENCES "ContentArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContentQueryOwnerReview"
ADD CONSTRAINT "cqor_evidence_fk" FOREIGN KEY ("evidenceSnapshotId")
REFERENCES "ContentEvidenceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
