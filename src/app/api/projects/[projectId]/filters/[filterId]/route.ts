import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string; filterId: string }> };

export async function DELETE(
  _request: NextRequest,
  { params }: Params
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, filterId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const filter = await prisma.savedFilter.findFirst({
    where: { id: filterId, projectId: project.id },
  });
  if (!filter) {
    return NextResponse.json(
      { error: "필터를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (filter.userId !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    await prisma.savedFilter.delete({ where: { id: filter.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
