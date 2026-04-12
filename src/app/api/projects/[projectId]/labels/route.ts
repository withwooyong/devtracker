import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
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

  const labels = await prisma.label.findMany({
    where: { projectId: project.id },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ labels });
}

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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

    const label = await prisma.label.create({
      data: { ...data, projectId: project.id },
    });

    return NextResponse.json({ label }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "라벨 생성 실패" }, { status: 400 });
  }
}
