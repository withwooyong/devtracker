import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  MAX_ATTACHMENT_SIZE,
  ALLOWED_MIME_PREFIXES,
  MAX_ATTACHMENTS_PER_ISSUE,
} from "@/types/attachment";

type Params = { params: Promise<{ projectId: string; issueId: string }> };

async function resolveIssue(projectId: string, issueId: string) {
  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) return { project: null, issue: null };

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
  return { project, issue };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;
  const { project, issue } = await resolveIssue(projectId, issueId);
  if (!project || !issue) {
    return NextResponse.json(
      { error: "이슈를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const attachments = await prisma.attachment.findMany({
    where: { issueId: issue.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ attachments });
}

function sanitizeFilename(name: string) {
  return name
    .replace(/\.\./g, "_")
    .replace(/[^\w가-힣.\-]/g, "_")
    .slice(0, 120);
}

function isAllowedMime(mime: string) {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;
  const { project, issue } = await resolveIssue(projectId, issueId);
  if (!project || !issue) {
    return NextResponse.json(
      { error: "이슈를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "multipart/form-data 요청이 필요합니다." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "파일을 첨부해주세요." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "빈 파일은 업로드할 수 없습니다." },
      { status: 400 }
    );
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json(
      { error: "파일 크기는 4MB 이하로 제한됩니다." },
      { status: 413 }
    );
  }

  if (!isAllowedMime(file.type)) {
    return NextResponse.json(
      { error: `허용되지 않는 파일 형식입니다: ${file.type || "unknown"}` },
      { status: 400 }
    );
  }

  const attachmentCount = await prisma.attachment.count({
    where: { issueId: issue.id },
  });
  if (attachmentCount >= MAX_ATTACHMENTS_PER_ISSUE) {
    return NextResponse.json(
      {
        error: `이슈당 첨부파일은 최대 ${MAX_ATTACHMENTS_PER_ISSUE}개까지 가능합니다.`,
      },
      { status: 429 }
    );
  }

  const safeName = sanitizeFilename(file.name);
  const blobPath = `issues/${issue.id}/${Date.now()}-${safeName}`;

  let blobUrl: string | null = null;
  try {
    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type,
    });
    blobUrl = blob.url;

    const attachment = await prisma.attachment.create({
      data: {
        issueId: issue.id,
        userId: user.userId,
        filename: safeName,
        url: blob.url,
        size: file.size,
        mimeType: file.type,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    await prisma.activity.create({
      data: {
        issueId: issue.id,
        userId: user.userId,
        action: "ATTACHMENT_ADDED",
        field: "attachments",
        newValue: safeName,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    if (blobUrl) {
      await del(blobUrl).catch((cleanupErr) =>
        console.error("[attachments] blob rollback failed", {
          cleanupErr,
          blobUrl,
        })
      );
    }
    console.error("[attachments] upload failed", { err, issueId: issue.id });
    return NextResponse.json(
      { error: "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
