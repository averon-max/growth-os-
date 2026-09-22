-- CreateEnum
CREATE TYPE "KeywordOutcomeDecision" AS ENUM ('CREATE', 'UPDATE', 'SKIP');

-- CreateEnum
CREATE TYPE "KeywordOutcomeActionStatus" AS ENUM ('PLANNED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KeywordOutcomeCheckpoint" AS ENUM ('BASELINE', 'DAY_7', 'DAY_14', 'DAY_28');

-- CreateEnum
CREATE TYPE "KeywordOutcomeLiveRankState" AS ENUM ('FOUND', 'NOT_TOP_100', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "KeywordOutcomeObservationSource" AS ENUM ('ACTION_BASELINE', 'LIVE_SERP', 'GOOGLE_SEARCH_CONSOLE', 'COMBINED', 'MANUAL');

-- CreateTable
CREATE TABLE "KeywordOutcomeAction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "keywordId" TEXT,
    "keywordText" TEXT NOT NULL,
    "normalizedKeyword" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "device" TEXT NOT NULL DEFAULT 'desktop',
    "decision" "KeywordOutcomeDecision" NOT NULL,
    "status" "KeywordOutcomeActionStatus" NOT NULL DEFAULT 'PLANNED',
    "targetPageUrl" TEXT,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "planSnapshot" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GROWTH_OS_ACTION_PLAN_V1',
    "baselineLiveRank" INTEGER,
    "baselineLiveRankState" "KeywordOutcomeLiveRankState" NOT NULL,
    "baselineImpressions" INTEGER,
    "baselineClicks" INTEGER,
    "baselineCtr" DECIMAL(8,4),
    "baselineAveragePosition" DECIMAL(6,2),
    "baselineGscSnapshotDate" DATE,
    "appliedFixId" TEXT,
    "contentArticleId" TEXT,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordOutcomeAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordOutcomeObservation" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "checkpoint" "KeywordOutcomeCheckpoint" NOT NULL,
    "source" "KeywordOutcomeObservationSource" NOT NULL,
    "liveRank" INTEGER,
    "liveRankState" "KeywordOutcomeLiveRankState" NOT NULL,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "ctr" DECIMAL(8,4),
    "averagePosition" DECIMAL(6,2),
    "gscSnapshotDate" DATE,
    "pageUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordOutcomeObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_workspaceId_idx" ON "KeywordOutcomeAction"("workspaceId");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_websiteId_idx" ON "KeywordOutcomeAction"("websiteId");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_keywordId_idx" ON "KeywordOutcomeAction"("keywordId");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_websiteId_normalizedKeyword_market_idx" ON "KeywordOutcomeAction"("websiteId", "normalizedKeyword", "market");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_status_idx" ON "KeywordOutcomeAction"("status");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_createdAt_idx" ON "KeywordOutcomeAction"("createdAt");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_appliedFixId_idx" ON "KeywordOutcomeAction"("appliedFixId");

-- CreateIndex
CREATE INDEX "KeywordOutcomeAction_contentArticleId_idx" ON "KeywordOutcomeAction"("contentArticleId");

-- CreateIndex
CREATE INDEX "KeywordOutcomeObservation_actionId_idx" ON "KeywordOutcomeObservation"("actionId");

-- CreateIndex
CREATE INDEX "KeywordOutcomeObservation_checkpoint_idx" ON "KeywordOutcomeObservation"("checkpoint");

-- CreateIndex
CREATE INDEX "KeywordOutcomeObservation_observedAt_idx" ON "KeywordOutcomeObservation"("observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordOutcomeObservation_actionId_checkpoint_key" ON "KeywordOutcomeObservation"("actionId", "checkpoint");

-- AddForeignKey
ALTER TABLE "KeywordOutcomeAction" ADD CONSTRAINT "KeywordOutcomeAction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordOutcomeAction" ADD CONSTRAINT "KeywordOutcomeAction_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordOutcomeAction" ADD CONSTRAINT "KeywordOutcomeAction_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordOutcomeObservation" ADD CONSTRAINT "KeywordOutcomeObservation_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "KeywordOutcomeAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
