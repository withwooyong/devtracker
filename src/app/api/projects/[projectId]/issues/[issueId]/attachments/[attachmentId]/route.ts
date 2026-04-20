import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    projectId: string;
    issueId: string;
    attachmentId: string;
  }>;
};

export async function DELETE(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId, attachmentId } = await params;

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

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, issueId: issue.id },
  });
  if (!attachment) {
    return NextResponse.json(
      { error: "첨부파일을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  if (attachment.userId !== user.userId && user.role !== "ADMIN") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    // Best-effort: DB 삭제는 성공해야 하고 blob 삭제 실패는 로그만 남김
    await prisma.attachment.delete({ where: { id: attachment.id } });
    try {
      await del(attachment.url);
    } catch (err) {
      console.error("[attachments] blob delete failed", {
        err,
        attachmentId: attachment.id,
      });
    }

    await prisma.activity.create({
      data: {
        issueId: issue.id,
        userId: user.userId,
        action: "ATTACHMENT_REMOVED",
        field: "attachments",
        oldValue: attachment.filename,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
