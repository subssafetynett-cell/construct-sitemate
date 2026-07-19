-- AlterEnum: accepted responses now move the workflow status to closed
ALTER TYPE "NonconformanceStatus" ADD VALUE IF NOT EXISTS 'closed';
