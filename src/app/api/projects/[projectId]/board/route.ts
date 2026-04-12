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

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { items } = updateSchema.parse(body);

    // 모든 이슈가 해당 프로젝트 소속인지 검증
    const issueIds = items.map((item) => item.id);
    const issues = await prisma.issue.findMany({
      where: { id: { in: issueIds }, projectId: project.id },
      select: { id: true },
    });
    if (issues.length !== issueIds.length) {
      return NextResponse.json({ error: "유효하지 않은 이슈가 포함되어 있습니다." }, { status: 400 });
    }

    await prisma.$transaction(
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
