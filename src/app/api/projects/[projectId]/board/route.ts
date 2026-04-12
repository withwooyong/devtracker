import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
      kanbanOrder: z.number(),
    })
  ),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  await params; // validate route

  try {
    const body = await request.json();
    const { items } = updateSchema.parse(body);

    await Promise.all(
      items.map((item) =>
        prisma.issue.update({
          where: { id: item.id },
          data: { status: item.status, kanbanOrder: item.kanbanOrder },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
