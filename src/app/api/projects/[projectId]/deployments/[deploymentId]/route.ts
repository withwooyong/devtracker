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

  const { deploymentId } = await params;

  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
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
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { deploymentId } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const deployment = await prisma.deployment.update({
      where: { id: deploymentId },
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
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
