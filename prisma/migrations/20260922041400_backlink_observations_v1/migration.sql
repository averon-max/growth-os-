-- CreateEnum
CREATE TYPE "BacklinkSnapshotSource" AS ENUM ('DATAFORSEO', 'MANUAL');

-- CreateEnum
CREATE TYPE "BacklinkSnapshotExecutionStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "BacklinkTarget" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "contentArticleId" TEXT NOT NULL,
    "publishedUrl" TEXT NOT NULL,
    "normalizedPublishedUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklinkTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkSnapshot" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "source" "BacklinkSnapshotSource" NOT NULL,
    "executionStatus" "BacklinkSnapshotExecutionStatus" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "snapshotFingerprint" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklinkSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacklinkObservation" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "normalizedSourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "normalizedTargetUrl" TEXT NOT NULL,
    "anchorText" TEXT,
    "nofollow" BOOLEAN,
    "sponsored" BOOLEAN,
    "ugc" BOOLEAN,
    "providerFirstSeenAt" TIMESTAMP(3),
    "providerLastSeenAt" TIMESTAMP(3),
    "providerRef" TEXT,
    "providerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BacklinkObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BacklinkTarget_contentArticleId_key" ON "BacklinkTarget"("contentArticleId");

-- CreateIndex
CREATE INDEX "BacklinkTarget_websiteId_idx" ON "BacklinkTarget"("websiteId");

-- CreateIndex
CREATE INDEX "BacklinkTarget_normalizedPublishedUrl_idx" ON "BacklinkTarget"("normalizedPublishedUrl");

-- CreateIndex
CREATE INDEX "BacklinkSnapshot_targetId_capturedAt_idx" ON "BacklinkSnapshot"("targetId", "capturedAt");

-- CreateIndex
CREATE INDEX "BacklinkSnapshot_executionStatus_capturedAt_idx" ON "BacklinkSnapshot"("executionStatus", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BacklinkSnapshot_targetId_snapshotFingerprint_key" ON "BacklinkSnapshot"("targetId", "snapshotFingerprint");

-- CreateIndex
CREATE INDEX "BacklinkObservation_snapshotId_idx" ON "BacklinkObservation"("snapshotId");

-- CreateIndex
CREATE INDEX "BacklinkObservation_sourceDomain_idx" ON "BacklinkObservation"("sourceDomain");

-- CreateIndex
CREATE INDEX "BacklinkObservation_normalizedTargetUrl_idx" ON "BacklinkObservation"("normalizedTargetUrl");

-- CreateIndex
CREATE UNIQUE INDEX "BacklinkObservation_snapshotId_normalizedSourceUrl_normaliz_key" ON "BacklinkObservation"("snapshotId", "normalizedSourceUrl", "normalizedTargetUrl");

-- AddForeignKey
ALTER TABLE "BacklinkTarget" ADD CONSTRAINT "BacklinkTarget_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkTarget" ADD CONSTRAINT "BacklinkTarget_contentArticleId_fkey" FOREIGN KEY ("contentArticleId") REFERENCES "ContentArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkSnapshot" ADD CONSTRAINT "BacklinkSnapshot_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "BacklinkTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacklinkObservation" ADD CONSTRAINT "BacklinkObservation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BacklinkSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
