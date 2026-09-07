-- CreateTable
CREATE TABLE "KeywordSuggestionCache" (
    "id" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordSuggestionCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiUsageCounter" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "counterType" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApiUsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KeywordSuggestionCache_normalized_source_key" ON "KeywordSuggestionCache"("normalized", "source");

-- CreateIndex
CREATE INDEX "ApiUsageCounter_workspaceId_idx" ON "ApiUsageCounter"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsageCounter_workspaceId_counterType_date_key" ON "ApiUsageCounter"("workspaceId", "counterType", "date");
