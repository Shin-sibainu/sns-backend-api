/*
  Warnings:

  - You are about to drop the column `shrineName` on the `Post` table. All the data in the column will be lost.
  - Added the required column `shrineId` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Post" DROP COLUMN "shrineName",
ADD COLUMN     "shrineId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_shrineId_fkey" FOREIGN KEY ("shrineId") REFERENCES "Shrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
