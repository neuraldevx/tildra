/*
  Warnings:

  - You are about to drop the column `totalSummariesGenerated` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "totalSummariesGenerated",
ADD COLUMN     "totalSummariesMade" INTEGER NOT NULL DEFAULT 0;
