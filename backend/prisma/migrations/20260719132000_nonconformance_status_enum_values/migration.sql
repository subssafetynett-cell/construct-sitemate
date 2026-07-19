-- New enum values must be committed in their own migration before any later
-- migration can reference them (Postgres error 55P04 otherwise).
ALTER TYPE "NonconformanceStatus" ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE "NonconformanceStatus" ADD VALUE IF NOT EXISTS 'response_submitted';
ALTER TYPE "NonconformanceStatus" ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE "NonconformanceStatus" ADD VALUE IF NOT EXISTS 'reopened';
