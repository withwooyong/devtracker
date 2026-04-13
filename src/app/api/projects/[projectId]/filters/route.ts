import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: Params
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

  const filters = await prisma.savedFilter.findMany({
    where: {
      projectId: project.id,
      OR: [{ userId: user.userId }, { isShared: true }],
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ filters });
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  filters: z.string(),
  isShared: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: Params
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
    const data = createSchema.parse(body);

    const filter = await prisma.savedFilter.create({
      data: {
        projectId: project.id,
        userId: user.userId,
        name: data.name,
        filters: data.filters,
        isShared: data.isShared ?? false,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ filter }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
