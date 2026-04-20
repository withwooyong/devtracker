import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 100;

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/drain] CRON_SECRET 미설정");
    return false;
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  return safeCompare(token, secret);
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  const now = new Date();
  const pending = await prisma.notificationOutbox.findMany({
    where: {
      scheduledFor: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { scheduledFor: "asc" },
    take: BATCH_SIZE,
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
      const backoffSeconds = Math.pow(2, nextAttempts); // 2,4,8,16,32
      const scheduledFor = new Date(
        now.getTime() + backoffSeconds * 1000
      );
      const msg = err instanceof Error ? err.message : String(err);

      if (nextAttempts >= MAX_ATTEMPTS) {
        console.error("[cron/drain] exhausted notification", {
          id: row.id,
          userId: row.userId,
          type: row.type,
          lastError: msg,
        });
        // 소진 시: outbox에 그대로 두되 더 이상 처리 안 됨 (수동 조사용)
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

  return NextResponse.json({
    ok: true,
    processed: pending.length,
    delivered,
    failed,
    exhausted,
  });
}
