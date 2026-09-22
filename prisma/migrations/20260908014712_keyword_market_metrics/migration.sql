-- CreateTable
CREATE TABLE "KeywordMarketMetric" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "volume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DECIMAL(10,4),
    "competitionIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordMarketMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KeywordMarketMetric_keywordId_idx" ON "KeywordMarketMetric"("keywordId");

-- CreateIndex
CREATE INDEX "KeywordMarketMetric_market_idx" ON "KeywordMarketMetric"("market");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordMarketMetric_keywordId_market_language_key" ON "KeywordMarketMetric"("keywordId", "market", "language");

-- AddForeignKey
ALTER TABLE "KeywordMarketMetric" ADD CONSTRAINT "KeywordMarketMetric_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
