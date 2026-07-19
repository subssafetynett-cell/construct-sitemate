CREATE TYPE "NonconformancePriority" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "NcHistoryAction" AS ENUM (
  'created',
  'assigned',
  'draft_saved',
  'response_submitted',
  'under_review',
  'reopened',
  'rejection_reason',
  'accepted',
  'closed',
  'notification_sent',
  'email_sent'
);
CREATE TYPE "NcNotificationType" AS ENUM (
  'assigned',
  'response_submitted',
  'rejected_reopened',
  'accepted_closed'
);

CREATE TABLE "nonconformances" (
  "id" TEXT NOT NULL,
  "nc_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" "NonconformancePriority" NOT NULL DEFAULT 'medium',
  "reporter_id" TEXT NOT NULL,
  "assignee_id" TEXT NOT NULL,
  "due_date" DATE NOT NULL,
  "status" "NonconformanceStatus" NOT NULL DEFAULT 'assigned',
  "closed_at" TIMESTAMP(3),
  "source_form_response_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nonconformances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nc_responses" (
  "id" TEXT NOT NULL,
  "nonconformance_id" TEXT NOT NULL,
  "correction_done" TEXT NOT NULL,
  "root_cause" TEXT NOT NULL,
  "corrective_action" TEXT NOT NULL,
  "is_draft" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL,
  "submitted_by" TEXT NOT NULL,
  "submitted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nc_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nc_attachments" (
  "id" TEXT NOT NULL,
  "response_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nc_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "nc_history" (
  "id" TEXT NOT NULL,
  "nonconformance_id" TEXT NOT NULL,
  "action" "NcHistoryAction" NOT NULL,
  "actor_id" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "nc_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "nonconformance_id" TEXT NOT NULL,
  "type" "NcNotificationType" NOT NULL,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "nonconformances_nc_number_key" ON "nonconformances"("nc_number");
CREATE UNIQUE INDEX "nonconformances_source_form_response_id_key" ON "nonconformances"("source_form_response_id");
CREATE INDEX "nonconformances_assignee_id_status_idx" ON "nonconformances"("assignee_id", "status");
CREATE INDEX "nonconformances_reporter_id_status_idx" ON "nonconformances"("reporter_id", "status");
CREATE INDEX "nonconformances_priority_idx" ON "nonconformances"("priority");
CREATE INDEX "nonconformances_due_date_idx" ON "nonconformances"("due_date");
CREATE INDEX "nonconformances_created_at_idx" ON "nonconformances"("created_at");
CREATE UNIQUE INDEX "nc_responses_nonconformance_id_version_key" ON "nc_responses"("nonconformance_id", "version");
CREATE INDEX "nc_responses_nonconformance_id_is_draft_idx" ON "nc_responses"("nonconformance_id", "is_draft");
CREATE INDEX "nc_attachments_response_id_idx" ON "nc_attachments"("response_id");
CREATE INDEX "nc_history_nonconformance_id_created_at_idx" ON "nc_history"("nonconformance_id", "created_at");
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

ALTER TABLE "nonconformances" ADD CONSTRAINT "nonconformances_reporter_id_fkey"
  FOREIGN KEY ("reporter_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nonconformances" ADD CONSTRAINT "nonconformances_assignee_id_fkey"
  FOREIGN KEY ("assignee_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nonconformances" ADD CONSTRAINT "nonconformances_source_form_response_id_fkey"
  FOREIGN KEY ("source_form_response_id") REFERENCES "FormResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "nc_responses" ADD CONSTRAINT "nc_responses_nonconformance_id_fkey"
  FOREIGN KEY ("nonconformance_id") REFERENCES "nonconformances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nc_responses" ADD CONSTRAINT "nc_responses_submitted_by_fkey"
  FOREIGN KEY ("submitted_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nc_attachments" ADD CONSTRAINT "nc_attachments_response_id_fkey"
  FOREIGN KEY ("response_id") REFERENCES "nc_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nc_history" ADD CONSTRAINT "nc_history_nonconformance_id_fkey"
  FOREIGN KEY ("nonconformance_id") REFERENCES "nonconformances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nc_history" ADD CONSTRAINT "nc_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_nonconformance_id_fkey"
  FOREIGN KEY ("nonconformance_id") REFERENCES "nonconformances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
