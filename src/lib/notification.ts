import type { Prisma } from "@prisma/client";
import { drainInBackground } from "@/lib/notification-drain";
import type { NotificationType } from "@/types/notification";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

function isValidLink(link: string): boolean {
  return (
    typeof link === "string" &&
    link.startsWith("/") &&
    !link.startsWith("//")
  );
}

function dedupKey(item: CreateNotificationInput) {
  return `${item.userId}:${item.type}:${item.link}`;
}

function sanitize(inputs: CreateNotificationInput[]) {
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
    unique.set(dedupKey(item), item);
  }
  return Array.from(unique.values());
}

/**
 * 본 요청 트랜잭션 내부에서 알림을 outbox에 적재한다.
 * 본 요청 write가 롤백되면 outbox도 함께 롤백되어 알림 유실/유령 알림을 방지.
 * 트랜잭션 커밋 성공 후 triggerNotificationDrain()을 호출해 즉시 배달 시도.
 */
export async function enqueueNotificationsTx(
  tx: Prisma.TransactionClient,
  inputs: CreateNotificationInput[]
) {
  const list = sanitize(inputs);
  if (list.length === 0) return;
  await tx.notificationOutbox.createMany({ data: list });
}

/** 트랜잭션 커밋 후 인라인 드레인을 예약한다. 실패는 삼키고 일일 cron이 catch-up. */
export function triggerNotificationDrain() {
  drainInBackground();
}
