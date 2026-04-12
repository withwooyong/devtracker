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
  const env = request.nextUrl.searchParams.get("environment");

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const where: Record<string, unknown> = { projectId: project.id };
  if (env && env !== "ALL") where.environment = env;

  const deployments = await prisma.deployment.findMany({
    where,
    include: {
      deployedBy: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ deployments });
}

const createSchema = z.object({
  version: z.string().min(1),
  environment: z.enum(["DEV", "STAGING", "PROD"]),
  description: z.string().optional(),
  changes: z.string().optional(),
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
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const deployment = await prisma.deployment.create({
      data: {
        ...data,
        projectId: project.id,
        deployedById: user.userId,
      },
      include: {
        deployedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ deployment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값 오류", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
