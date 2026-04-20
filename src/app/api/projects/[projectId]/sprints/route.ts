import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId } = await params;
  const status = request.nextUrl.searchParams.get("status");
  const allowedStatus = new Set(["PLANNED", "ACTIVE", "COMPLETED"]);

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
  if (status && status !== "ALL") {
    if (!allowedStatus.has(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 status 값입니다." },
        { status: 400 }
      );
    }
    where.status = status;
  }

  const sprints = await prisma.sprint.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { issues: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  return NextResponse.json({ sprints });
}

const dateString = z
  .string()
  .min(1)
  .refine((v) => !isNaN(new Date(v).getTime()), {
    message: "유효한 날짜가 아닙니다.",
  });

const createSchema = z
  .object({
    name: z.string().min(1).max(100),
    goal: z.string().max(500).optional().nullable(),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "종료일은 시작일 이후여야 합니다.",
    path: ["endDate"],
  });

export async function POST(request: NextRequest, { params }: Params) {
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
    const data = createSchema.parse(body);

    const sprint = await prisma.sprint.create({
      data: {
        projectId: project.id,
        name: data.name,
        goal: data.goal ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        createdById: user.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { issues: true } },
      },
    });

    return NextResponse.json({ sprint }, { status: 201 });
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
