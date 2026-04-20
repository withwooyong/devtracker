import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createNotifications } from "@/lib/notification";
import { z } from "zod";

type Params = { params: Promise<{ projectId: string; sprintId: string }> };

async function resolveProject(projectId: string) {
  return prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, sprintId } = await params;
  const project = await resolveProject(projectId);
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId: project.id },
    include: {
      createdBy: { select: { id: true, name: true } },
      issues: {
        include: {
          assignee: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          labels: true,
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!sprint) {
    return NextResponse.json(
      { error: "스프린트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ sprint });
}

const dateString = z
  .string()
  .refine((v) => !isNaN(new Date(v).getTime()), {
    message: "유효한 날짜가 아닙니다.",
  });

const updateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    goal: z.string().max(500).nullable().optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    status: z.enum(["PLANNED", "ACTIVE", "COMPLETED"]).optional(),
  })
  .refine(
    (d) =>
      !d.startDate ||
      !d.endDate ||
      new Date(d.endDate) > new Date(d.startDate),
    { message: "종료일은 시작일 이후여야 합니다.", path: ["endDate"] }
  );

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, sprintId } = await params;
  const project = await resolveProject(projectId);
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const existing = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId: project.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "스프린트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (existing.createdById !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const sprint = await prisma.sprint.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...("goal" in data ? { goal: data.goal ?? null } : {}),
        ...(data.startDate
          ? { startDate: new Date(data.startDate) }
          : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { issues: true } },
      },
    });

    if (
      data.status &&
      data.status !== existing.status &&
      (data.status === "ACTIVE" || data.status === "COMPLETED")
    ) {
      const assignees = await prisma.issue.findMany({
        where: { sprintId: existing.id, assigneeId: { not: null } },
        select: { assigneeId: true },
        distinct: ["assigneeId"],
      });
      const recipients = assignees
        .map((i) => i.assigneeId)
        .filter((id): id is string => !!id && id !== user.userId);

      if (recipients.length > 0) {
        const notifType =
          data.status === "ACTIVE" ? "SPRINT_STARTED" : "SPRINT_COMPLETED";
        const titlePrefix =
          data.status === "ACTIVE" ? "스프린트 시작" : "스프린트 완료";
        await createNotifications(
          recipients.map((userId) => ({
            userId,
            type: notifType,
            title: `${titlePrefix}: ${sprint.name}`,
            message: sprint.goal ?? "",
            link: `/projects/${project.key}/sprints/${sprint.id}`,
          }))
        );
      }
    }

    return NextResponse.json({ sprint });
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

  const { projectId, sprintId } = await params;
  const project = await resolveProject(projectId);
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const existing = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId: project.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "스프린트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (existing.createdById !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    await prisma.$transaction([
      prisma.issue.updateMany({
        where: { sprintId: existing.id },
        data: { sprintId: null },
      }),
      prisma.sprint.delete({ where: { id: existing.id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
