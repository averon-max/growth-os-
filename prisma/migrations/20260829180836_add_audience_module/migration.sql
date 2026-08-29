-- AlterEnum
ALTER TYPE "ProviderType" ADD VALUE 'GOOGLE_ANALYTICS_4';

-- CreateTable
CREATE TABLE "AudienceSegment" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceSnapshot" (
    "id" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "userCount" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GOOGLE_ANALYTICS_4',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudienceSegment_websiteId_idx" ON "AudienceSegment"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceSegment_websiteId_name_key" ON "AudienceSegment"("websiteId", "name");

-- CreateIndex
CREATE INDEX "AudienceSnapshot_segmentId_idx" ON "AudienceSnapshot"("segmentId");

-- CreateIndex
CREATE INDEX "AudienceSnapshot_date_idx" ON "AudienceSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceSnapshot_segmentId_date_source_key" ON "AudienceSnapshot"("segmentId", "date", "source");

-- AddForeignKey
ALTER TABLE "AudienceSegment" ADD CONSTRAINT "AudienceSegment_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceSnapshot" ADD CONSTRAINT "AudienceSnapshot_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "AudienceSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
