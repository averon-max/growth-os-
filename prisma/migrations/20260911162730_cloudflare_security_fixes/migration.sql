ALTER TABLE "CloudflareConnection" RENAME COLUMN "apiToken" TO "apiTokenEncrypted";
ALTER TABLE "TrafficSnapshot" RENAME COLUMN "humanRequests" TO "unclassifiedRequests";
