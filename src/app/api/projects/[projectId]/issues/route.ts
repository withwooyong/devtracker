import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId } = await params;
  const url = request.nextUrl;
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assigneeId = url.searchParams.get("assigneeId");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const where: Record<string, unknown> = { projectId: project.id };
  if (status && status !== "ALL") where.status = status;
  if (priority && priority !== "ALL") where.priority = priority;
  if (assigneeId && assigneeId !== "ALL") where.assigneeId = assigneeId;
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        labels: true,
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  return NextResponse.json({
    issues,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  assigneeId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
  dueDate: z.string().optional().nullable(),
});

export async function POST(
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
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { labelIds, ...data } = createSchema.parse(body);

    // Get next issue number
    const lastIssue = await prisma.issue.findFirst({
      where: { projectId: project.id },
      orderBy: { issueNumber: "desc" },
    });
    const issueNumber = (lastIssue?.issueNumber ?? 0) + 1;

    // Get max kanban order for the status
    const lastKanban = await prisma.issue.findFirst({
      where: { projectId: project.id, status: data.status },
      orderBy: { kanbanOrder: "desc" },
    });
    const kanbanOrder = (lastKanban?.kanbanOrder ?? -1) + 1;

    const issue = await prisma.issue.create({
      data: {
        ...data,
        projectId: project.id,
        issueNumber,
        reporterId: user.userId,
        kanbanOrder,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        ...(labelIds?.length
          ? { labels: { connect: labelIds.map((id) => ({ id })) } }
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

    return NextResponse.json({ issue }, { status: 201 });
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
