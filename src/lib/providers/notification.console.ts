import { prisma } from "@/lib/prisma";
import type { NotificationProvider, SendNotificationInput } from "./notification.provider";

// Dev/MVP implementation: always persists an in-app Notification row, and
// logs to the console in place of an actual push/email send. Swap for
// AwsSesSnsProvider in Phase 2 without touching any calling code.
export class ConsoleNotificationProvider implements NotificationProvider {
  async send(input: SendNotificationInput) {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        eventType: input.eventType,
        channel: input.channel,
        title: input.title,
        body: input.body,
        linkUrl: input.linkUrl,
      },
    });

    if (input.channel !== "IN_APP") {
      console.info(`[notification:${input.channel}] -> ${input.userId}: ${input.title}`);
    }
  }
}
