-- AlterEnum
ALTER TYPE "BacklinkSnapshotExecutionStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "BacklinkSnapshot" ADD COLUMN     "itemsFetched" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "providerTotalCount" INTEGER,
ADD COLUMN     "scanComplete" BOOLEAN NOT NULL DEFAULT false;
