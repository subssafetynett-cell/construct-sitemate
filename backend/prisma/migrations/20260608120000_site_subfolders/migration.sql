-- CreateTable
CREATE TABLE "SiteSubfolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSubfolder_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SiteDocument" ADD COLUMN "subfolderId" TEXT;

-- CreateIndex
CREATE INDEX "SiteSubfolder_siteId_idx" ON "SiteSubfolder"("siteId");

-- AddForeignKey
ALTER TABLE "SiteSubfolder" ADD CONSTRAINT "SiteSubfolder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDocument" ADD CONSTRAINT "SiteDocument_subfolderId_fkey" FOREIGN KEY ("subfolderId") REFERENCES "SiteSubfolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
