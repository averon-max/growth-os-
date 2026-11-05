-- CreateTable
CREATE TABLE "SiteBacklink" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "anchor" TEXT,
    "linkCount" INTEGER,
    "firstSeen" TIMESTAMP(3),
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteBacklink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteBacklink_websiteId_idx" ON "SiteBacklink"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteBacklink_websiteId_source_sourceDomain_sourceUrl_target_key" ON "SiteBacklink"("websiteId", "source", "sourceDomain", "sourceUrl", "targetUrl");
