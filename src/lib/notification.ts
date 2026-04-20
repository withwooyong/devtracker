import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/types/notification";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

// 방어: 알림 링크는 내부 경로만 허용
function isValidLink(link: string): boolean {
  return (
    typeof link === "string" &&
    link.startsWith("/") &&
    !link.startsWith("//")
  );
}

// 배치 내 중복 제거 (스프린트 시작처럼 동일 링크로 여러 명에게 가는 경우에만 의미)
function dedupKey(item: CreateNotificationInput) {
  return `${item.userId}:${item.type}:${item.link}`;
}

/**
 * 알림은 NotificationOutbox에 먼저 적재되고, 별도 cron drain 프로세스가
 * 실제 Notification 행을 생성한다. 본 요청의 응답 경로를 빠르게 유지하고,
 * 일시 장애 시 재시도를 가능하게 한다.
 *
 * 참고: 여기가 본 요청 트랜잭션과 atomic하지는 않다 — 본 트랜잭션 커밋 후
 * outbox insert가 실패하면 알림이 유실될 수 있다. 진짜 아토믹성은 각 호출
 * 지점을 prisma.$transaction으로 감싸는 후속 작업 필요.
 */
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
    await prisma.notificationOutbox.create({ data: input });
  } catch (err) {
    console.error("[notification] outbox insert failed", {
      err,
      userId: input.userId,
      type: input.type,
    });
  }
}

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
    unique.set(dedupKey(item), item);
  }
  const list = Array.from(unique.values());
  if (list.length === 0) return;
  try {
    await prisma.notificationOutbox.createMany({ data: list });
  } catch (err) {
    console.error("[notification] outbox createMany failed", {
      err,
      count: list.length,
      types: Array.from(new Set(list.map((i) => i.type))),
    });
  }
}
