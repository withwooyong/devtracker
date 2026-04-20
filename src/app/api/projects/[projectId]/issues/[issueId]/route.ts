import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotifications } from "@/lib/notification";
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

  const isNumeric = /^\d+$/.test(issueId);
  const target = isNumeric
    ? await prisma.issue.findUnique({ where: { projectId_issueNumber: { projectId: project.id, issueNumber: parseInt(issueId, 10) } } })
    : await prisma.issue.findFirst({ where: { id: issueId, projectId: project.id } });

  if (!target) {
    return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
  }

  const issue = await prisma.issue.findUnique({
    where: { id: target.id },
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
  sprintId: z.string().optional().nullable(),
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

    const isNumeric = /^\d+$/.test(issueId);
    const existingIssue = isNumeric
      ? await prisma.issue.findUnique({
          where: { projectId_issueNumber: { projectId: project.id, issueNumber: parseInt(issueId, 10) } },
          include: { labels: { select: { id: true } } },
        })
      : await prisma.issue.findFirst({
          where: { id: issueId, projectId: project.id },
          include: { labels: { select: { id: true } } },
        });

    if (!existingIssue) {
      return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
    }

    if (data.sprintId) {
      const sprint = await prisma.sprint.findFirst({
        where: { id: data.sprintId, projectId: project.id },
        select: { id: true },
      });
      if (!sprint) {
        return NextResponse.json(
          { error: "해당 스프린트는 이 프로젝트에 속하지 않습니다." },
          { status: 400 }
        );
      }
    }

    let completedAtUpdate: Date | null | undefined;
    if (data.status !== undefined && data.status !== existingIssue.status) {
      if (data.status === "DONE") completedAtUpdate = new Date();
      else if (existingIssue.status === "DONE") completedAtUpdate = null;
    }

    const issue = await prisma.issue.update({
      where: { id: existingIssue.id },
      data: {
        ...data,
        dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
        ...(completedAtUpdate !== undefined
          ? { completedAt: completedAtUpdate }
          : {}),
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

    // Build activity records for changed fields
    const activityData: {
      issueId: string;
      userId: string;
      action: string;
      field?: string;
      oldValue?: string | null;
      newValue?: string | null;
    }[] = [];

    if (data.status !== undefined && data.status !== existingIssue.status) {
      activityData.push({
        issueId: existingIssue.id,
        userId: user.userId,
        action: "STATUS_CHANGED",
        field: "status",
        oldValue: existingIssue.status,
        newValue: data.status,
      });
    }

    if (data.priority !== undefined && data.priority !== existingIssue.priority) {
      activityData.push({
        issueId: existingIssue.id,
        userId: user.userId,
        action: "PRIORITY_CHANGED",
        field: "priority",
        oldValue: existingIssue.priority,
        newValue: data.priority,
      });
    }

    if ("assigneeId" in data && data.assigneeId !== existingIssue.assigneeId) {
      activityData.push({
        issueId: existingIssue.id,
        userId: user.userId,
        action: "ASSIGNEE_CHANGED",
        field: "assigneeId",
        oldValue: existingIssue.assigneeId ?? null,
        newValue: data.assigneeId ?? null,
      });
    }

    if ("sprintId" in data && data.sprintId !== existingIssue.sprintId) {
      activityData.push({
        issueId: existingIssue.id,
        userId: user.userId,
        action: "SPRINT_CHANGED",
        field: "sprintId",
        oldValue: existingIssue.sprintId ?? null,
        newValue: data.sprintId ?? null,
      });
    }

    if (labelIds !== undefined) {
      const existingLabelIds = new Set(existingIssue.labels.map((l) => l.id));
      const newLabelIds = new Set(labelIds);

      for (const id of newLabelIds) {
        if (!existingLabelIds.has(id)) {
          activityData.push({
            issueId: existingIssue.id,
            userId: user.userId,
            action: "LABEL_ADDED",
            field: "labelIds",
            newValue: id,
          });
        }
      }

      for (const id of existingLabelIds) {
        if (!newLabelIds.has(id)) {
          activityData.push({
            issueId: existingIssue.id,
            userId: user.userId,
            action: "LABEL_REMOVED",
            field: "labelIds",
            oldValue: id,
          });
        }
      }
    }

    if (activityData.length > 0) {
      await prisma.activity.createMany({ data: activityData });
    }

    const notifications: Parameters<typeof createNotifications>[0] = [];
    const issueLink = `/projects/${project.key}/issues/${existingIssue.issueNumber}`;
    const issueRef = `${project.key}-${existingIssue.issueNumber}`;

    if (
      "assigneeId" in data &&
      data.assigneeId &&
      data.assigneeId !== existingIssue.assigneeId &&
      data.assigneeId !== user.userId
    ) {
      notifications.push({
        userId: data.assigneeId,
        type: "ISSUE_ASSIGNED",
        title: `${issueRef} 이슈가 회원님에게 할당되었습니다`,
        message: issue.title,
        link: issueLink,
      });
    }

    if (
      data.status !== undefined &&
      data.status !== existingIssue.status &&
      existingIssue.assigneeId &&
      existingIssue.assigneeId !== user.userId
    ) {
      notifications.push({
        userId: existingIssue.assigneeId,
        type: "ISSUE_STATUS_CHANGED",
        title: `${issueRef} 상태 변경: ${existingIssue.status} → ${data.status}`,
        message: issue.title,
        link: issueLink,
      });
    }

    if (notifications.length > 0) {
      await createNotifications(notifications);
    }

    return NextResponse.json({ issue });
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

export async function DELETE(_request: NextRequest, { params }: Params) {
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

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId: project.id },
  });
  if (!issue) {
    return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    await prisma.issue.delete({ where: { id: issue.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
