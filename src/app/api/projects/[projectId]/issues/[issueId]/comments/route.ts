import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  enqueueNotificationsTx,
  triggerNotificationDrain,
} from "@/lib/notification";
import { z } from "zod";

type Params = {
  params: Promise<{ projectId: string; issueId: string }>;
};

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
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId: project.id },
  });
  if (!issue) {
    return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { issueId: issue.id },
    include: {
      author: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

const createSchema = z.object({
  content: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { projectId, issueId } = await params;

  const project = await prisma.project.findFirst({
    where: { OR: [{ id: projectId }, { key: projectId }] },
  });
  if (!project) {
    return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
  }

  const issue = await prisma.issue.findFirst({
    where: { id: issueId, projectId: project.id },
  });
  if (!issue) {
    return NextResponse.json({ error: "이슈를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { content } = createSchema.parse(body);

    const recipients = new Set<string>();
    if (issue.assigneeId && issue.assigneeId !== user.userId) {
      recipients.add(issue.assigneeId);
    }
    if (issue.reporterId !== user.userId) {
      recipients.add(issue.reporterId);
    }

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          content,
          issueId: issue.id,
          authorId: user.userId,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.activity.create({
        data: {
          issueId: issue.id,
          userId: user.userId,
          action: "COMMENT_ADDED",
        },
      });

      if (recipients.size > 0) {
        const plain = content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        await enqueueNotificationsTx(
          tx,
          Array.from(recipients).map((userId) => ({
            userId,
            type: "ISSUE_COMMENTED",
            title: `${project.key}-${issue.issueNumber} 에 새 댓글`,
            message: `${created.author.name}: ${plain.slice(0, 80)}`,
            link: `/projects/${project.key}/issues/${issue.issueNumber}`,
          }))
        );
      }

      return created;
    });

    if (recipients.size > 0) triggerNotificationDrain();
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
