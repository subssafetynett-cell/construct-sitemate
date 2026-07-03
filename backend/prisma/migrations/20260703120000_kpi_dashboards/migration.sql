-- CreateTable
CREATE TABLE "KpiDashboard" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiDashboard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KpiDashboard_clientId_idx" ON "KpiDashboard"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiDashboard_clientId_section_key" ON "KpiDashboard"("clientId", "section");

-- AddForeignKey
ALTER TABLE "KpiDashboard" ADD CONSTRAINT "KpiDashboard_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KpiDashboard" ADD CONSTRAINT "KpiDashboard_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
