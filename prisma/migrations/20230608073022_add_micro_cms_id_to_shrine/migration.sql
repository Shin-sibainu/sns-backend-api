/*
  Warnings:

  - A unique constraint covering the columns `[microCmsId]` on the table `Shrine` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `microCmsId` to the `Shrine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Shrine" ADD COLUMN     "microCmsId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Shrine_microCmsId_key" ON "Shrine"("microCmsId");
