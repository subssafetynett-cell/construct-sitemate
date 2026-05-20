-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteManager" (
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SiteManager_pkey" PRIMARY KEY ("siteId","userId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteManager_userId_idx" ON "SiteManager"("userId");

-- AddForeignKey
ALTER TABLE "SiteManager" ADD CONSTRAINT "SiteManager_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteManager" ADD CONSTRAINT "SiteManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing primary managers
INSERT INTO "SiteManager" ("siteId", "userId")
SELECT s."id", s."managerId"
FROM "Site" s
WHERE s."managerId" IS NOT NULL
ON CONFLICT DO NOTHING;
