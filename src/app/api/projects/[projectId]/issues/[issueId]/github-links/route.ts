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

  const isNumeric = /^\d+$/.test(issueId);
  const issue = isNumeric
    ? await prisma.issue.findUnique({
        where: {
          projectId_issueNumber: {
            projectId: project.id,
            issueNumber: parseInt(issueId, 10),
          },
        },
      })
    : await prisma.issue.findFirst({
        where: { id: issueId, projectId: project.id },
      });

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
