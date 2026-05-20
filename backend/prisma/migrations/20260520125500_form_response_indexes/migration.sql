CREATE INDEX IF NOT EXISTS "FormResponse_createdAt_idx" ON "FormResponse"("createdAt");
CREATE INDEX IF NOT EXISTS "FormResponse_category_idx" ON "FormResponse"("category");
CREATE INDEX IF NOT EXISTS "FormResponse_submittedById_idx" ON "FormResponse"("submittedById");
CREATE INDEX IF NOT EXISTS "FormResponse_formId_idx" ON "FormResponse"("formId");
CREATE INDEX IF NOT EXISTS "FormResponse_submittedById_createdAt_idx" ON "FormResponse"("submittedById", "createdAt");
