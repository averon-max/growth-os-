-- CreateEnum
CREATE TYPE "ContentBriefStatus" AS ENUM ('DRAFT', 'READY');

-- CreateEnum
CREATE TYPE "ContentArticleStatus" AS ENUM ('GENERATING', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'PUBLISH_FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "topic" TEXT NOT NULL,
    "searchIntent" TEXT NOT NULL,
    "primaryKeyword" TEXT NOT NULL,
    "secondaryKeywords" TEXT[],
    "outline" JSONB NOT NULL,
    "status" "ContentBriefStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentArticle" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "status" "ContentArticleStatus" NOT NULL DEFAULT 'GENERATING',
    "generatedBy" TEXT NOT NULL,
    "publishedUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentBrief_websiteId_idx" ON "ContentBrief"("websiteId");

-- CreateIndex
CREATE INDEX "ContentBrief_opportunityId_idx" ON "ContentBrief"("opportunityId");

-- CreateIndex
CREATE INDEX "ContentArticle_briefId_idx" ON "ContentArticle"("briefId");

-- CreateIndex
CREATE INDEX "ContentArticle_status_idx" ON "ContentArticle"("status");

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentArticle" ADD CONSTRAINT "ContentArticle_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE CASCADE ON UPDATE CASCADE;
