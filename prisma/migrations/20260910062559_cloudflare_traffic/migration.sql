-- CreateTable
CREATE TABLE "CloudflareConnection" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudflareConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSnapshot" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalRequests" INTEGER NOT NULL,
    "humanRequests" INTEGER NOT NULL,
    "verifiedBotRequests" INTEGER NOT NULL,
    "unverifiedBotRequests" INTEGER NOT NULL,
    "threatsBlocked" INTEGER NOT NULL,
    "bandwidthBytes" BIGINT NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrafficSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CloudflareConnection_websiteId_key" ON "CloudflareConnection"("websiteId");

-- CreateIndex
CREATE INDEX "TrafficSnapshot_connectionId_date_idx" ON "TrafficSnapshot"("connectionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficSnapshot_connectionId_date_key" ON "TrafficSnapshot"("connectionId", "date");

-- AddForeignKey
ALTER TABLE "CloudflareConnection" ADD CONSTRAINT "CloudflareConnection_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrafficSnapshot" ADD CONSTRAINT "TrafficSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CloudflareConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
