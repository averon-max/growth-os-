/*
  Warnings:

  - The values [DAY_56] on the enum `KeywordOutcomeCheckpoint` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "KeywordOutcomeCheckpoint_new" AS ENUM ('BASELINE', 'DAY_7', 'DAY_14', 'DAY_28', 'DAY_60', 'DAY_90');
ALTER TABLE "KeywordOutcomeObservation" ALTER COLUMN "checkpoint" TYPE "KeywordOutcomeCheckpoint_new" USING ("checkpoint"::text::"KeywordOutcomeCheckpoint_new");
ALTER TYPE "KeywordOutcomeCheckpoint" RENAME TO "KeywordOutcomeCheckpoint_old";
ALTER TYPE "KeywordOutcomeCheckpoint_new" RENAME TO "KeywordOutcomeCheckpoint";
DROP TYPE "public"."KeywordOutcomeCheckpoint_old";
COMMIT;

-- CreateTable
CREATE TABLE "TrackedKeyword" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackedKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedKeyword_websiteId_idx" ON "TrackedKeyword"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackedKeyword_websiteId_keyword_key" ON "TrackedKeyword"("websiteId", "keyword");

-- RenameForeignKey
ALTER TABLE "SerpReplayArtifact" RENAME CONSTRAINT "SerpReplayArtifact_contentArticleId_fkey" TO "cqor_article_fk";

-- AddForeignKey
ALTER TABLE "TrackedKeyword" ADD CONSTRAINT "TrackedKeyword_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
