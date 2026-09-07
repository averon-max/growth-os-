/*
  Warnings:

  - A unique constraint covering the columns `[keywordId,date,device,country,source,pageUrl]` on the table `KeywordSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "KeywordSnapshot_keywordId_date_device_country_source_key";

-- AlterTable
ALTER TABLE "KeywordSnapshot" ADD COLUMN     "pageUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "KeywordSnapshot_keywordId_date_device_country_source_pageUr_key" ON "KeywordSnapshot"("keywordId", "date", "device", "country", "source", "pageUrl");
