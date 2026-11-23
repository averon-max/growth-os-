-- Saved DataForSEO answers get a kind (category) so each kind can be kept for its own number of days.
ALTER TABLE "ApiCache" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'other';
UPDATE "ApiCache" SET "category" = CASE
  WHEN "endpoint" LIKE 'v3/serp/%' THEN 'serp'
  WHEN "endpoint" LIKE 'v3/on_page/%' OR "endpoint" LIKE 'v3/content_analysis/%' THEN 'pages'
  WHEN "endpoint" LIKE 'v3/backlinks/%' THEN 'backlinks'
  WHEN "endpoint" LIKE 'v3/dataforseo_labs/%' AND "endpoint" ~ '(ranked_keywords|competitors_domain|domain_rank_overview|domain_intersection|relevant_pages|subdomains|historical_rank_overview)' THEN 'domains'
  WHEN "endpoint" LIKE 'v3/keywords_data/%' OR "endpoint" LIKE 'v3/dataforseo_labs/%' THEN 'keywords'
  ELSE 'other'
END;
CREATE INDEX "ApiCache_category_createdAt_idx" ON "ApiCache"("category", "createdAt");

-- App-wide settings (cache days, daily budget).
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Real DataForSEO spending per day and endpoint.
CREATE TABLE "DfsSpend" (
    "date" DATE NOT NULL,
    "endpoint" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "DfsSpend_pkey" PRIMARY KEY ("date", "endpoint")
);
