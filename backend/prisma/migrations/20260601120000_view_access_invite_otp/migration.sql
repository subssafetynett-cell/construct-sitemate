-- View-access invites: OTP verification on top of email link
ALTER TABLE "EmailVerificationToken" ADD COLUMN "otpHash" TEXT;
ALTER TABLE "EmailVerificationToken" ADD COLUMN "otpExpiresAt" TIMESTAMP(3);
ALTER TABLE "EmailVerificationToken" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'standard';

CREATE INDEX "EmailVerificationToken_kind_idx" ON "EmailVerificationToken"("kind");
