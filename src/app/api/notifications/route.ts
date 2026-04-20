import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const unreadOnly =
    request.nextUrl.searchParams.get("unreadOnly") === "true";
  const rawLimit = parseInt(
    request.nextUrl.searchParams.get("limit") ?? "30",
    10
  );
  const limit =
    isNaN(rawLimit) || rawLimit < 1 ? 30 : Math.min(rawLimit, 100);

  const where: Record<string, unknown> = { userId: user.userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: user.userId, isRead: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);

    if (data.markAll) {
      await prisma.notification.updateMany({
        where: { userId: user.userId, isRead: false },
        data: { isRead: true },
      });
    } else if (data.ids && data.ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: data.ids }, userId: user.userId },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
