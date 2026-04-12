import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

type Params = {
  params: Promise<{ projectId: string; deploymentId: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, deploymentId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const deployment = await prisma.deployment.findFirst({
    where: { id: deploymentId, projectId: project.id },
    include: {
      deployedBy: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  if (!deployment) {
    return NextResponse.json({ error: "배포 기록 없음" }, { status: 404 });
  }

  return NextResponse.json({ deployment });
}

const updateSchema = z.object({
  status: z
    .enum(["PENDING", "IN_PROGRESS", "SUCCESS", "FAILED", "ROLLED_BACK"])
    .optional(),
  description: z.string().optional(),
  changes: z.string().optional(),
  deployedAt: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { projectId, deploymentId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const existing = await prisma.deployment.findFirst({
    where: { id: deploymentId, projectId: project.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "배포 기록 없음" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const deployment = await prisma.deployment.update({
      where: { id: existing.id },
      data: {
        ...data,
        deployedAt: data.deployedAt ? new Date(data.deployedAt) : data.status === "SUCCESS" ? new Date() : undefined,
      },
      include: {
        deployedBy: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ deployment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
