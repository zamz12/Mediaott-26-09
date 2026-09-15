-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEventType" ADD VALUE 'CONTENT_SUBMITTED';
ALTER TYPE "NotificationEventType" ADD VALUE 'CONTENT_FLAGGED';
ALTER TYPE "NotificationEventType" ADD VALUE 'CONTENT_RESTRICTED';
ALTER TYPE "NotificationEventType" ADD VALUE 'CONTENT_TAKEDOWN';
ALTER TYPE "NotificationEventType" ADD VALUE 'VIOLATION_ISSUED';
ALTER TYPE "NotificationEventType" ADD VALUE 'NEW_MESSAGE';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "palette" TEXT NOT NULL DEFAULT 'cyan',
ADD COLUMN     "uiScale" TEXT NOT NULL DEFAULT 'COMFORTABLE';

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_recipientId_isRead_idx" ON "Message"("recipientId", "isRead");

-- CreateIndex
CREATE INDEX "Message_senderId_recipientId_idx" ON "Message"("senderId", "recipientId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
