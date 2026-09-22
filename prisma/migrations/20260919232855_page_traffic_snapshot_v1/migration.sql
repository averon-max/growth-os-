-- CreateTable
CREATE TABLE "PageTrafficSnapshot" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "totalRequests" INTEGER NOT NULL,
    "visits" INTEGER NOT NULL,
    "verifiedBotRequests" INTEGER NOT NULL,
    "unclassifiedRequests" INTEGER NOT NULL,
    "botCategoryBreakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageTrafficSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageTrafficSnapshot_connectionId_path_date_idx" ON "PageTrafficSnapshot"("connectionId", "path", "date");

-- CreateIndex
CREATE INDEX "PageTrafficSnapshot_connectionId_date_idx" ON "PageTrafficSnapshot"("connectionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PageTrafficSnapshot_connectionId_date_path_key" ON "PageTrafficSnapshot"("connectionId", "date", "path");

-- AddForeignKey
ALTER TABLE "PageTrafficSnapshot" ADD CONSTRAINT "PageTrafficSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CloudflareConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
