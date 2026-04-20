import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const DEFAULT_BATCH_SIZE = 100;

export interface DrainResult {
  processed: number;
  delivered: number;
  failed: number;
  exhausted: number;
}

/**
 * NotificationOutbox의 pending 행을 실제 Notification 행으로 생성한다.
 * 성공 시 outbox 행 삭제 (트랜잭션). 실패 시 attempts 증가 + 지수 백오프.
 *
 * Hobby 플랜은 분 단위 cron이 불가능해 두 가지로 호출됨:
 * 1. 알림 트리거 직후 inline 호출 (fire-and-forget)
 * 2. 일일 cron safety net
 */
export async function drainNotificationOutbox(
  batchSize = DEFAULT_BATCH_SIZE
): Promise<DrainResult> {
  const now = new Date();
  const pending = await prisma.notificationOutbox.findMany({
    where: {
      scheduledFor: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { scheduledFor: "asc" },
    take: batchSize,
  });

  let delivered = 0;
  let failed = 0;
  let exhausted = 0;

  for (const row of pending) {
    try {
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            userId: row.userId,
            type: row.type,
            title: row.title,
            message: row.message,
            link: row.link,
          },
        }),
        prisma.notificationOutbox.delete({ where: { id: row.id } }),
      ]);
      delivered++;
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      const backoffSeconds = Math.pow(2, nextAttempts);
      const scheduledFor = new Date(now.getTime() + backoffSeconds * 1000);
      const msg = err instanceof Error ? err.message : String(err);

      if (nextAttempts >= MAX_ATTEMPTS) {
        console.error("[outbox] exhausted notification", {
          id: row.id,
          userId: row.userId,
          type: row.type,
          lastError: msg,
        });
        await prisma.notificationOutbox
          .update({
            where: { id: row.id },
            data: { attempts: nextAttempts, lastError: msg },
          })
          .catch(() => {});
        exhausted++;
      } else {
        await prisma.notificationOutbox
          .update({
            where: { id: row.id },
            data: {
              attempts: nextAttempts,
              lastError: msg,
              scheduledFor,
            },
          })
          .catch(() => {});
        failed++;
      }
    }
  }

  return {
    processed: pending.length,
    delivered,
    failed,
    exhausted,
  };
}

/**
 * Fire-and-forget 인라인 드레인. 트리거 경로에서 호출해 즉시 배달 시도.
 * 에러는 삼키고 로그만 (본 요청 응답 경로를 막지 않음).
 */
export function drainInBackground() {
  drainNotificationOutbox().catch((err) =>
    console.error("[outbox] inline drain failed", err)
  );
}
