import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      githubRepo: true,
      githubWebhookSecret: true,
      createdById: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { issues: true, deployments: true } },
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 비밀값은 절대 반환하지 않고, 설정 여부만 노출한다.
  const { githubWebhookSecret, ...safe } = project;
  return NextResponse.json({
    project: {
      ...safe,
      githubWebhookSecretSet: Boolean(githubWebhookSecret),
    },
  });
}

// 각 세그먼트 단위로 검증하고 `..`를 명시적으로 금지
const githubRepoPattern =
  /^(?!.*\.\.)[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  githubRepo: z
    .union([
      z.literal(""),
      z.string().regex(githubRepoPattern, {
        message: "owner/repo 형식이어야 합니다.",
      }),
    ])
    .nullable()
    .optional(),
  githubWebhookSecret: z
    .union([
      z.literal(""),
      z
        .string()
        .min(16, { message: "webhook secret은 16자 이상이어야 합니다." })
        .max(256, { message: "webhook secret은 256자 이하여야 합니다." }),
    ])
    .nullable()
    .optional(),
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

  const existing = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!existing) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const canEdit = user.role === "ADMIN" || existing.createdById === user.userId;
  if (!canEdit) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...("description" in data ? { description: data.description ?? null } : {}),
        ...("githubRepo" in data
          ? { githubRepo: data.githubRepo ? data.githubRepo : null }
          : {}),
        ...("githubWebhookSecret" in data
          ? {
              githubWebhookSecret: data.githubWebhookSecret
                ? data.githubWebhookSecret
                : null,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        githubRepo: true,
        githubWebhookSecret: true,
        createdById: true,
        createdAt: true,
      },
    });

    // 응답에도 secret 원문은 노출하지 않는다.
    const { githubWebhookSecret, ...safe } = project;
    return NextResponse.json({
      project: {
        ...safe,
        githubWebhookSecretSet: Boolean(githubWebhookSecret),
      },
    });
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { projectId } = await params;

  const existing = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!existing) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    await prisma.project.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
