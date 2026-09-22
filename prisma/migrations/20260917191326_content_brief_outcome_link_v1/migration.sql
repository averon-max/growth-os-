-- AlterTable
ALTER TABLE "ContentBrief" ADD COLUMN     "outcomeActionId" TEXT;

-- CreateIndex
CREATE INDEX "ContentBrief_outcomeActionId_idx" ON "ContentBrief"("outcomeActionId");

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_outcomeActionId_fkey" FOREIGN KEY ("outcomeActionId") REFERENCES "KeywordOutcomeAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
