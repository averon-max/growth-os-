-- CreateEnum
CREATE TYPE "BusinessFactType" AS ENUM ('CAPABILITY', 'METRIC', 'DATA_SOURCE', 'POLICY', 'DIFFERENTIATOR', 'COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "BusinessFactStatus" AS ENUM ('PROPOSED', 'VERIFIED', 'REJECTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "BusinessFact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" "BusinessFactType" NOT NULL,
    "claim" TEXT NOT NULL,
    "status" "BusinessFactStatus" NOT NULL DEFAULT 'PROPOSED',
    "sourceUrl" TEXT,
    "sourceLabel" TEXT,
    "evidence" TEXT,
    "confidence" DOUBLE PRECISION,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" TEXT,
    "createdByUserId" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFactEvent" (
    "id" TEXT NOT NULL,
    "businessFactId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "previousStatus" "BusinessFactStatus",
    "nextStatus" "BusinessFactStatus",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessFactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEvidenceSnapshot" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "primaryKeyword" TEXT NOT NULL,
    "searchIntent" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "businessFacts" JSONB NOT NULL,
    "keywordContext" JSONB,
    "plannerVersion" TEXT NOT NULL,
    "gateVersion" TEXT NOT NULL,
    "generatorModel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentEvidenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessFact_businessId_status_idx" ON "BusinessFact"("businessId", "status");

-- CreateIndex
CREATE INDEX "BusinessFact_businessId_type_idx" ON "BusinessFact"("businessId", "type");

-- CreateIndex
CREATE INDEX "BusinessFact_supersedesId_idx" ON "BusinessFact"("supersedesId");

-- CreateIndex
CREATE INDEX "BusinessFactEvent_businessFactId_createdAt_idx" ON "BusinessFactEvent"("businessFactId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEvidenceSnapshot_briefId_key" ON "ContentEvidenceSnapshot"("briefId");

-- CreateIndex
CREATE INDEX "ContentEvidenceSnapshot_websiteId_createdAt_idx" ON "ContentEvidenceSnapshot"("websiteId", "createdAt");

-- AddForeignKey
ALTER TABLE "BusinessFact" ADD CONSTRAINT "BusinessFact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFact" ADD CONSTRAINT "BusinessFact_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "BusinessFact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFactEvent" ADD CONSTRAINT "BusinessFactEvent_businessFactId_fkey" FOREIGN KEY ("businessFactId") REFERENCES "BusinessFact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEvidenceSnapshot" ADD CONSTRAINT "ContentEvidenceSnapshot_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEvidenceSnapshot" ADD CONSTRAINT "ContentEvidenceSnapshot_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
