-- AlterTable
ALTER TABLE "TrafficSnapshot" ALTER COLUMN "unverifiedBotRequests" DROP NOT NULL,
ALTER COLUMN "threatsBlocked" DROP NOT NULL;
