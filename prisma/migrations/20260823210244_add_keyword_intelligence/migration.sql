-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('GOOGLE_SEARCH_CONSOLE');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "KeywordIntent" AS ENUM ('INFORMATIONAL', 'COMMERCIAL', 'TRANSACTIONAL', 'NAVIGATIONAL');

-- CreateTable
CREATE TABLE "ProviderConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "accessTokenRef" TEXT,
    "refreshTokenRef" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "intent" "KeywordIntent",
    "cluster" TEXT,
    "volume" INTEGER,
    "difficulty" INTEGER,
    "cpc" DECIMAL(10,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordSnapshot" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "position" DECIMAL(6,2),
    "clicks" INTEGER,
    "impressions" INTEGER,
    "ctr" DECIMAL(8,4),
    "device" TEXT NOT NULL DEFAULT 'DESKTOP',
    "country" TEXT NOT NULL DEFAULT 'us',
    "source" TEXT NOT NULL DEFAULT 'GOOGLE_SEARCH_CONSOLE',
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderConnection_workspaceId_idx" ON "ProviderConnection"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConnection_workspaceId_provider_key" ON "ProviderConnection"("workspaceId", "provider");

-- CreateIndex
CREATE INDEX "Keyword_workspaceId_idx" ON "Keyword"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_workspaceId_normalized_key" ON "Keyword"("workspaceId", "normalized");

-- CreateIndex
CREATE INDEX "KeywordSnapshot_keywordId_idx" ON "KeywordSnapshot"("keywordId");

-- CreateIndex
CREATE INDEX "KeywordSnapshot_date_idx" ON "KeywordSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "KeywordSnapshot_keywordId_date_device_country_source_key" ON "KeywordSnapshot"("keywordId", "date", "device", "country", "source");

-- AddForeignKey
ALTER TABLE "ProviderConnection" ADD CONSTRAINT "ProviderConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordSnapshot" ADD CONSTRAINT "KeywordSnapshot_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;
