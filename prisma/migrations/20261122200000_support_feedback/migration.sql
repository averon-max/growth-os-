ALTER TABLE "SupportTicket" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'ticket', ADD COLUMN "pageUrl" TEXT, ADD COLUMN "userAgent" TEXT;
CREATE INDEX "SupportTicket_kind_status_idx" ON "SupportTicket"("kind", "status");
