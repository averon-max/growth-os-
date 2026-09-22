-- AlterTable
ALTER TABLE "TrafficSnapshot" ADD COLUMN     "countryBreakdown" JSONB,
ADD COLUMN     "deviceBreakdown" JSONB;
