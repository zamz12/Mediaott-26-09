import type { NotificationChannel, NotificationEventType } from "@prisma/client";

export interface SendNotificationInput {
  userId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  title: string;
  body?: string;
  linkUrl?: string;
}

export interface NotificationProvider {
  send(input: SendNotificationInput): Promise<void>;
}
