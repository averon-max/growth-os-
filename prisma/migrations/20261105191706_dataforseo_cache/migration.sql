-- CreateTable
CREATE TABLE "ApiCache" (
    "key" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "ApiCache_endpoint_idx" ON "ApiCache"("endpoint");
