-- CreateEnum
CREATE TYPE "VideoOrientation" AS ENUM ('LANDSCAPE', 'PORTRAIT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Visibility" ADD VALUE 'SUBSCRIBERS_ONLY';
ALTER TYPE "Visibility" ADD VALUE 'PUBLIC_18_PLUS';
ALTER TYPE "Visibility" ADD VALUE 'REGULATORY_HOLD';

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "countryCode" TEXT;

-- AlterTable
ALTER TABLE "VideoAsset" ADD COLUMN     "orientation" "VideoOrientation" NOT NULL DEFAULT 'LANDSCAPE';
