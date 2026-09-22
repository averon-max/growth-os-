/*
  Warnings:

  - Added the required column `compatibilityReason` to the `KeywordOutcomeAction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `compatibilitySnapshot` to the `KeywordOutcomeAction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `compatibilityStatus` to the `KeywordOutcomeAction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "KeywordOutcomeCompatibilityStatus" AS ENUM ('SUPPORTED', 'EDUCATIONAL_ONLY', 'UNVERIFIED', 'CONFLICT');

-- AlterTable
ALTER TABLE "KeywordOutcomeAction" ADD COLUMN     "compatibilityCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "compatibilityReason" TEXT NOT NULL,
ADD COLUMN     "compatibilitySnapshot" JSONB NOT NULL,
ADD COLUMN     "compatibilityStatus" "KeywordOutcomeCompatibilityStatus" NOT NULL;
