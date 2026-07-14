-- Snapshot company on each form response so reassigning a user's company
-- does not move or hide historical submissions from the original org lists.
ALTER TABLE "FormResponse" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

UPDATE "FormResponse" fr
SET "clientId" = u."clientId"
FROM "User" u
WHERE fr."submittedById" = u.id
  AND fr."clientId" IS NULL
  AND u."clientId" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FormResponse_clientId_fkey'
  ) THEN
    ALTER TABLE "FormResponse"
      ADD CONSTRAINT "FormResponse_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FormResponse_clientId_idx" ON "FormResponse"("clientId");
