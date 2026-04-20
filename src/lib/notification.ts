import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/types/notification";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    await prisma.notification.create({ data: input });
  } catch (err) {
    console.error("[notification] create failed", err);
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  const unique = new Map<string, CreateNotificationInput>();
  for (const item of inputs) {
    unique.set(`${item.userId}:${item.type}:${item.link}`, item);
  }
  const list = Array.from(unique.values());
  if (list.length === 0) return;
  try {
    await prisma.notification.createMany({ data: list });
  } catch (err) {
    console.error("[notification] createMany failed", err);
  }
}
