/*
  Warnings:

  - A unique constraint covering the columns `[outcomeActionId]` on the table `ContentBrief` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ContentBrief_outcomeActionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "ContentBrief_outcomeActionId_key" ON "ContentBrief"("outcomeActionId");
