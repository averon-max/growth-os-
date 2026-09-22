/*
  Warnings:

  - A unique constraint covering the columns `[supersedesActionId]` on the table `KeywordOutcomeAction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "KeywordOutcomeAction" ADD COLUMN     "supersedesActionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "KeywordOutcomeAction_supersedesActionId_key" ON "KeywordOutcomeAction"("supersedesActionId");

-- AddForeignKey
ALTER TABLE "KeywordOutcomeAction" ADD CONSTRAINT "KeywordOutcomeAction_supersedesActionId_fkey" FOREIGN KEY ("supersedesActionId") REFERENCES "KeywordOutcomeAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
