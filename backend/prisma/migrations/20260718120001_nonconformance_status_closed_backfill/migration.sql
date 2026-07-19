-- Backfill: actions already accepted by the reporter were left as status 'sent'.
-- Runs as a separate migration so the new enum value is committed first.
UPDATE "NonconformanceAction"
SET "status" = 'closed'
WHERE "registerStatus" = 'closed'
  AND "status" = 'sent';
