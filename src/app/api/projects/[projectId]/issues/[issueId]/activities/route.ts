import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string; issueId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;
  const url = request.nextUrl;
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const rawLimit = parseInt(url.searchParams.get("limit") || "50", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 100);

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const issueNumber = parseInt(issueId);
  const target = isNaN(issueNumber)
    ? await prisma.issue.findFirst({ where: { id: issueId, projectId: project.id } })
    : await prisma.issue.findUnique({
        where: { projectId_issueNumber: { projectId: project.id, issueNumber } },
      });

  if (!target) {
    return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: { issueId: target.id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activity.count({ where: { issueId: target.id } }),
  ]);

  return NextResponse.json({
    activities,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
