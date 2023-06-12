/*
  Warnings:

  - Changed the type of `prefecture` on the `Shrine` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Shrine" DROP COLUMN "prefecture",
ADD COLUMN     "prefecture" TEXT NOT NULL;

-- DropEnum
DROP TYPE "Prefecture";
