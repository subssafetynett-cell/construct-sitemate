-- Mirror answers.siteId / answers.subfolderId on FormResponse for indexed site-pack filtering.
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "subfolderId" TEXT;

UPDATE "FormResponse"
SET "siteId" = NULLIF(TRIM(answers->>'siteId'), '')
WHERE "siteId" IS NULL
  AND answers->>'siteId' IS NOT NULL
  AND TRIM(answers->>'siteId') <> '';

UPDATE "FormResponse"
SET "subfolderId" = NULLIF(TRIM(answers->>'subfolderId'), '')
WHERE "subfolderId" IS NULL
  AND answers->>'subfolderId' IS NOT NULL
  AND TRIM(answers->>'subfolderId') <> '';

CREATE INDEX IF NOT EXISTS "FormResponse_siteId_idx" ON "FormResponse"("siteId");
CREATE INDEX IF NOT EXISTS "FormResponse_subfolderId_idx" ON "FormResponse"("subfolderId");
CREATE INDEX IF NOT EXISTS "FormResponse_siteId_subfolderId_idx" ON "FormResponse"("siteId", "subfolderId");
