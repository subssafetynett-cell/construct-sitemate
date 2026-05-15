-- Link sites to a company (client) and backfill from assigned site manager
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

ALTER TABLE "Site" DROP CONSTRAINT IF EXISTS "Site_clientId_fkey";
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Site" s
SET "clientId" = u."clientId"
FROM "User" u
WHERE s."managerId" = u."id"
  AND s."clientId" IS NULL;

CREATE INDEX IF NOT EXISTS "Site_clientId_idx" ON "Site"("clientId");
CREATE INDEX IF NOT EXISTS "Site_managerId_idx" ON "Site"("managerId");
