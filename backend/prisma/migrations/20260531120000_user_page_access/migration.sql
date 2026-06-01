-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('standard', 'view_only');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accessMode" "AccessMode" NOT NULL DEFAULT 'standard';
ALTER TABLE "User" ADD COLUMN "allowedPages" JSONB;
