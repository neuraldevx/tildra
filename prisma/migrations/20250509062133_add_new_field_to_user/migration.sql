-- CreateTable
CREATE TABLE "summary_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT,
    "title" TEXT,
    "tldr" TEXT NOT NULL,
    "key_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "summary_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "summary_history_userId_idx" ON "summary_history"("userId");

-- AddForeignKey
ALTER TABLE "summary_history" ADD CONSTRAINT "summary_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("clerkId") ON DELETE RESTRICT ON UPDATE CASCADE;
