-- CreateEnum
CREATE TYPE "SerpReplayArtifactExecutionStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SerpReplayArtifactStatus" AS ENUM ('READY', 'WARN', 'BLOCK', 'INSUFFICIENT_CONTEXT');

-- CreateTable
CREATE TABLE "SerpReplayArtifact" (
    "id" TEXT NOT NULL,
    "contentArticleId" TEXT NOT NULL,
    "artifactVersion" TEXT NOT NULL DEFAULT 'SERP_REPLAY_ARTIFACT_V1',
    "replayVersion" TEXT NOT NULL DEFAULT 'SERP_REPLAY_V1',
    "executionStatus" "SerpReplayArtifactExecutionStatus" NOT NULL,
    "replayStatus" "SerpReplayArtifactStatus",
    "articleFingerprint" TEXT NOT NULL,
    "articleFingerprintAlgo" TEXT NOT NULL DEFAULT 'SHA256_V1',
    "keyword" TEXT,
    "serpSnapshotFingerprint" TEXT,
    "serpCapturedAt" TIMESTAMP(3),
    "comparisons" JSONB,
    "blockers" JSONB,
    "warnings" JSONB,
    "provenance" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SerpReplayArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SerpReplayArtifact_contentArticleId_createdAt_idx" ON "SerpReplayArtifact"("contentArticleId", "createdAt");

-- CreateIndex
CREATE INDEX "SerpReplayArtifact_serpSnapshotFingerprint_idx" ON "SerpReplayArtifact"("serpSnapshotFingerprint");

-- CreateIndex
CREATE INDEX "SerpReplayArtifact_replayStatus_idx" ON "SerpReplayArtifact"("replayStatus");

-- AddForeignKey
ALTER TABLE "SerpReplayArtifact" ADD CONSTRAINT "SerpReplayArtifact_contentArticleId_fkey" FOREIGN KEY ("contentArticleId") REFERENCES "ContentArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
