-- CreateEnum
CREATE TYPE "NonconformanceRegisterStatus" AS ENUM ('open', 'closed', 'accepted', 'rejected');

-- AlterTable
ALTER TABLE "NonconformanceAction" ADD COLUMN "registerStatus" "NonconformanceRegisterStatus" NOT NULL DEFAULT 'open';
