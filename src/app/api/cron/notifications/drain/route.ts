import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { drainNotificationOutbox } from "@/lib/notification-drain";

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

  const result = await drainNotificationOutbox();
  return NextResponse.json({ ok: true, ...result });
}
