CREATE TYPE "BusinessFactEvidenceStatus" AS ENUM ('UNCHECKED', 'FRESH', 'DRIFTED', 'UNAVAILABLE');

ALTER TABLE "BusinessFact"
ADD COLUMN "evidenceStatus" "BusinessFactEvidenceStatus" NOT NULL DEFAULT 'UNCHECKED',
ADD COLUMN "evidenceHash" TEXT,
ADD COLUMN "sourceContentHash" TEXT,
ADD COLUMN "lastEvidenceCheckedAt" TIMESTAMP(3),
ADD COLUMN "lastEvidenceSeenAt" TIMESTAMP(3),
ADD COLUMN "evidenceCheckError" TEXT;

CREATE INDEX "BusinessFact_businessId_status_evidenceStatus_idx"
ON "BusinessFact"("businessId", "status", "evidenceStatus");
