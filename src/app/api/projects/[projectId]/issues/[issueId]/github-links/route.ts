import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ projectId: string; issueId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // UUID 우선 검사 (activities/route.ts와 동일 패턴). UUID 앞자리가 숫자인 경우에도
  // parseInt 오파싱으로 엉뚱한 이슈번호에 매칭되지 않도록 한다.
  const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const NUMERIC_PATTERN = /^\d+$/;

  let issue;
  if (UUID_PATTERN.test(issueId)) {
    issue = await prisma.issue.findFirst({
      where: { id: issueId, projectId: project.id },
    });
  } else if (NUMERIC_PATTERN.test(issueId)) {
    issue = await prisma.issue.findUnique({
      where: {
        projectId_issueNumber: {
          projectId: project.id,
          issueNumber: parseInt(issueId, 10),
        },
      },
    });
  } else {
    issue = null;
  }

  if (!issue) {
    return NextResponse.json(
      { error: "이슈를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const githubLinks = await prisma.gitHubLink.findMany({
    where: { issueId: issue.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ githubLinks });
}
