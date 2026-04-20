import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// 타이밍 공격 방지를 위한 상수 시간 비교
function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifySignature(rawBody: string, signatureHeader: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[github-webhook] GITHUB_WEBHOOK_SECRET 미설정");
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(signatureHeader, expected);
}

interface PullRequestPayload {
  action: string;
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    merged: boolean;
    state: string;
    head: { ref: string };
  };
  repository: { full_name: string };
}

// 이슈 키 패턴: DEV-123, ABC-1 등
function extractIssueKeys(...texts: string[]): Array<{ key: string; number: number }> {
  const re = /\b([A-Z][A-Z0-9]+)-(\d+)\b/g;
  const found = new Map<string, { key: string; number: number }>();
  for (const text of texts) {
    if (!text) continue;
    for (const m of text.matchAll(re)) {
      const signature = `${m[1]}-${m[2]}`;
      if (!found.has(signature)) {
        found.set(signature, { key: m[1], number: parseInt(m[2], 10) });
      }
    }
  }
  return Array.from(found.values());
}

function mapPrStatus(action: string, merged: boolean, state: string) {
  if (merged) return "merged";
  if (state === "closed") return "closed";
  return "open";
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: "서명이 유효하지 않습니다." },
      { status: 401 }
    );
  }

  // ping은 즉시 200
  if (event === "ping") {
    return NextResponse.json({ ok: true, event: "ping" });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, skipped: event });
  }

  let payload: PullRequestPayload;
  try {
    payload = JSON.parse(rawBody) as PullRequestPayload;
  } catch {
    return NextResponse.json(
      { error: "JSON 파싱에 실패했습니다." },
      { status: 400 }
    );
  }

  const pr = payload.pull_request;
  if (!pr) {
    return NextResponse.json({ error: "pull_request 필드 누락" }, { status: 400 });
  }

  const keys = extractIssueKeys(pr.title, pr.head?.ref ?? "");
  if (keys.length === 0) {
    return NextResponse.json({ ok: true, matched: 0 });
  }

  const status = mapPrStatus(payload.action, pr.merged, pr.state);
  const shouldCloseIssue = pr.merged; // 머지되면 연결된 이슈 상태를 DONE으로

  let matched = 0;
  for (const { key, number } of keys) {
    const project = await prisma.project.findFirst({
      where: { key },
      select: { id: true },
    });
    if (!project) continue;

    const issue = await prisma.issue.findUnique({
      where: {
        projectId_issueNumber: { projectId: project.id, issueNumber: number },
      },
      select: { id: true, status: true, assigneeId: true, reporterId: true },
    });
    if (!issue) continue;

    await prisma.gitHubLink.upsert({
      where: {
        issueId_url: { issueId: issue.id, url: pr.html_url },
      },
      update: {
        title: pr.title,
        status,
        externalId: String(pr.number),
      },
      create: {
        issueId: issue.id,
        type: "PR",
        url: pr.html_url,
        title: pr.title,
        status,
        externalId: String(pr.number),
      },
    });

    if (shouldCloseIssue && issue.status !== "DONE") {
      await prisma.issue.update({
        where: { id: issue.id },
        data: { status: "DONE", completedAt: new Date() },
      });
      // System activity: reporter가 변경한 것으로 기록 (사용자 매핑 기능 없으므로)
      await prisma.activity.create({
        data: {
          issueId: issue.id,
          userId: issue.reporterId,
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: issue.status,
          newValue: "DONE",
        },
      });
    }

    matched++;
  }

  return NextResponse.json({ ok: true, matched, event, action: payload.action });
}
