-- CreateTable
CREATE TABLE "SavedSignature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSignature_userId_idx" ON "SavedSignature"("userId");

-- AddForeignKey
ALTER TABLE "SavedSignature" ADD CONSTRAINT "SavedSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
