import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = {
  params: Promise<{
    projectId: string;
    issueId: string;
    attachmentId: string;
  }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
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

  try {
    const result = await get(attachment.url, { access: "private" });
    if (!result) {
      return NextResponse.json(
        { error: "파일을 불러올 수 없습니다." },
        { status: 404 }
      );
    }

    // ReadableStream을 그대로 응답으로 전달
    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
          attachment.filename
        )}`,
        // 브라우저 캐시는 짧게 — attachment.id는 안정 키지만 권한이 바뀔 수 있음
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("[attachments] proxy download failed", {
      err,
      attachmentId,
    });
    return NextResponse.json(
      { error: "파일을 불러오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
