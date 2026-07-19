ALTER TABLE "nonconformances" ADD COLUMN "client_id" TEXT;

UPDATE "nonconformances" nc
SET "client_id" = COALESCE(
  (
    SELECT fr."clientId"
    FROM "FormResponse" fr
    WHERE fr."id" = nc."source_form_response_id"
  ),
  (
    SELECT reporter."clientId"
    FROM "User" reporter
    WHERE reporter."id" = nc."reporter_id"
  )
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "nonconformances" WHERE "client_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot backfill nonconformances.client_id';
  END IF;
END $$;

ALTER TABLE "nonconformances" ALTER COLUMN "client_id" SET NOT NULL;

CREATE INDEX "nonconformances_client_id_status_idx"
  ON "nonconformances"("client_id", "status");
CREATE INDEX "nonconformances_client_id_due_date_idx"
  ON "nonconformances"("client_id", "due_date");

ALTER TABLE "nonconformances"
  ADD CONSTRAINT "nonconformances_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
