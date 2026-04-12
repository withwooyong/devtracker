import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ projectId: string; issueId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const issueNumber = parseInt(issueId);
  const where = isNaN(issueNumber)
    ? { id: issueId }
    : { projectId_issueNumber: { projectId: project.id, issueNumber } };

  const issue = await prisma.issue.findUnique({
    where,
    include: {
      assignee: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      reporter: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      labels: true,
      comments: {
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!issue) {
    return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ issue });
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().optional().nullable(),
  kanbanOrder: z.number().optional(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { labelIds, ...data } = updateSchema.parse(body);

    const issueNumber = parseInt(issueId);
    const where = isNaN(issueNumber)
      ? { id: issueId }
      : { projectId_issueNumber: { projectId: project.id, issueNumber } };

    const issue = await prisma.issue.update({
      where,
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
        ...(labelIds !== undefined
          ? { labels: { set: labelIds.map((id) => ({ id })) } }
          : {}),
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        labels: true,
      },
    });

    return NextResponse.json({ issue });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { issueId } = await params;

  await prisma.issue.delete({ where: { id: issueId } });

  return NextResponse.json({ success: true });
}
