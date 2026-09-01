-- CreateEnum
CREATE TYPE "CMSType" AS ENUM ('WORDPRESS');

-- CreateEnum
CREATE TYPE "CMSConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "AppliedFixStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "FixType" AS ENUM ('META_TITLE', 'META_DESCRIPTION', 'H1', 'ALT_TEXT', 'CANONICAL', 'INTERNAL_LINK', 'CONTENT');

-- CreateEnum
CREATE TYPE "FixRiskLevel" AS ENUM ('SAFE', 'REVIEW', 'DANGEROUS');

-- CreateTable
CREATE TABLE "CMSConnection" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "cmsType" "CMSType" NOT NULL,
    "status" "CMSConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "siteUrl" TEXT NOT NULL,
    "usernameRef" TEXT NOT NULL,
    "credentialRef" TEXT NOT NULL,
    "lastConnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CMSConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppliedFix" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT,
    "issueId" TEXT,
    "cmsConnectionId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "fixType" "FixType" NOT NULL,
    "riskLevel" "FixRiskLevel" NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT NOT NULL,
    "status" "AppliedFixStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "appliedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppliedFix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CMSConnection_websiteId_key" ON "CMSConnection"("websiteId");

-- CreateIndex
CREATE INDEX "CMSConnection_status_idx" ON "CMSConnection"("status");

-- CreateIndex
CREATE INDEX "AppliedFix_cmsConnectionId_idx" ON "AppliedFix"("cmsConnectionId");

-- CreateIndex
CREATE INDEX "AppliedFix_opportunityId_idx" ON "AppliedFix"("opportunityId");

-- CreateIndex
CREATE INDEX "AppliedFix_issueId_idx" ON "AppliedFix"("issueId");

-- CreateIndex
CREATE INDEX "AppliedFix_status_idx" ON "AppliedFix"("status");

-- CreateIndex
CREATE INDEX "AppliedFix_appliedAt_idx" ON "AppliedFix"("appliedAt");

-- AddForeignKey
ALTER TABLE "CMSConnection" ADD CONSTRAINT "CMSConnection_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedFix" ADD CONSTRAINT "AppliedFix_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedFix" ADD CONSTRAINT "AppliedFix_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "SEOIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppliedFix" ADD CONSTRAINT "AppliedFix_cmsConnectionId_fkey" FOREIGN KEY ("cmsConnectionId") REFERENCES "CMSConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
