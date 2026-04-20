import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/types/notification";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

// Defensive guard: notifications only point to internal pages.
function isValidLink(link: string): boolean {
  return typeof link === "string" && link.startsWith("/") && !link.startsWith("//");
}

export async function createNotification(input: CreateNotificationInput) {
  if (!isValidLink(input.link)) {
    console.error("[notification] rejected invalid link", {
      userId: input.userId,
      type: input.type,
      link: input.link,
    });
    return;
  }
  try {
    await prisma.notification.create({ data: input });
  } catch (err) {
    console.error("[notification] create failed", {
      err,
      userId: input.userId,
      type: input.type,
    });
  }
}

// Dedup scope is per-call: drops duplicates within the same batch
// (e.g. fan-out to multiple recipients). It does NOT deduplicate
// across separate trigger invocations.
export async function createNotifications(inputs: CreateNotificationInput[]) {
  const unique = new Map<string, CreateNotificationInput>();
  for (const item of inputs) {
    if (!isValidLink(item.link)) {
      console.error("[notification] rejected invalid link", {
        userId: item.userId,
        type: item.type,
        link: item.link,
      });
      continue;
    }
    unique.set(`${item.userId}:${item.type}:${item.link}`, item);
  }
  const list = Array.from(unique.values());
  if (list.length === 0) return;
  try {
    await prisma.notification.createMany({ data: list });
  } catch (err) {
    console.error("[notification] createMany failed", {
      err,
      count: list.length,
      types: Array.from(new Set(list.map((i) => i.type))),
    });
  }
}
