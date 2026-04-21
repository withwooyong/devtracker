import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// 타이밍 공격 방지를 위한 상수 시간 비교
function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function verifyWithSecret(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
) {
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
    user?: { login: string; id: number };
  };
  repository?: { full_name: string };
}

// PR 작성자를 DevTracker User로 매핑. githubId 우선(로그인 변경 내성), 없으면 githubLogin로 매칭.
// login으로 매칭됐을 때는 항상 githubId를 최신 값으로 덮어써서 다음 매칭부터는 id 경로로 즉시 찾히도록 한다.
async function resolvePullRequestAuthor(
  prUser: { login: string; id: number } | undefined
): Promise<{ id: string } | null> {
  if (!prUser) return null;
  const byId = await prisma.user.findUnique({
    where: { githubId: prUser.id },
    select: { id: true },
  });
  if (byId) return byId;

  const byLogin = await prisma.user.findUnique({
    where: { githubLogin: prUser.login },
    select: { id: true, githubId: true },
  });
  if (byLogin) {
    if (byLogin.githubId !== prUser.id) {
      await prisma.user
        .update({
          where: { id: byLogin.id },
          data: { githubId: prUser.id },
        })
        .catch(() => {
          // 다른 사용자가 동일 githubId를 선점했을 경우 unique 충돌. 이번 요청은 login 매칭으로 반환하고
          // 정합성은 해당 사용자 측 수동 정리에 맡긴다 (경고 로그만 남김).
          console.warn(
            "[github-webhook] githubId 업데이트 실패(unique 충돌 가능)",
            { userId: byLogin.id, prUserId: prUser.id, prUserLogin: prUser.login }
          );
        });
    }
    return { id: byLogin.id };
  }
  return null;
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

  // 1) 서명 검증을 위해선 어떤 secret으로 검증할지 먼저 결정해야 한다.
  //    - scoped 모드(`Project.githubRepo`가 매칭)에서 프로젝트별 secret이 설정되어 있으면
  //      그 프로젝트 secret으로만 검증한다(강한 테넌시 경계).
  //    - 그 외(프로젝트 secret 미설정, legacy, ping 등)에는 전역 `GITHUB_WEBHOOK_SECRET`를 사용한다.
  //    body 파싱은 검증 전에 한 번 해야 하는데, 이 시점에는 아직 신뢰 불가한 입력이다.
  //    JSON.parse 외에는 DB 질의(repo 문자열 완전일치)만 수행하며, 검증 실패 시 401로 차단한다.
  let parsedBody: PullRequestPayload | { repository?: { full_name: string } } | null =
    null;
  try {
    parsedBody = JSON.parse(rawBody) as PullRequestPayload;
  } catch {
    // ping 이외의 이벤트는 아래에서 JSON 재파싱 실패 시 400으로 처리
    parsedBody = null;
  }

  const repoFullName = parsedBody?.repository?.full_name ?? null;
  const scopedProject = repoFullName
    ? await prisma.project.findFirst({
        where: { githubRepo: repoFullName },
        select: { id: true, key: true, githubWebhookSecret: true },
      })
    : null;

  const globalSecret = process.env.GITHUB_WEBHOOK_SECRET ?? null;
  const selectedSecret =
    scopedProject?.githubWebhookSecret ?? globalSecret ?? null;
  const secretSource: "project" | "global" = scopedProject?.githubWebhookSecret
    ? "project"
    : "global";

  if (!selectedSecret) {
    console.error(
      "[github-webhook] 사용 가능한 secret 없음 (프로젝트 secret 미설정 + GITHUB_WEBHOOK_SECRET 미설정)"
    );
    return NextResponse.json(
      { error: "서명 검증 구성이 누락되었습니다." },
      { status: 500 }
    );
  }

  if (!verifyWithSecret(rawBody, signature, selectedSecret)) {
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

  // 여기 도달 시점에는 서명이 유효하므로 parsedBody는 신뢰 가능하지만, 구조 검증은 별도.
  const payload = parsedBody as PullRequestPayload | null;
  if (!payload) {
    return NextResponse.json(
      { error: "JSON 파싱에 실패했습니다." },
      { status: 400 }
    );
  }

  const pr = payload.pull_request;
  if (!pr) {
    return NextResponse.json({ error: "pull_request 필드 누락" }, { status: 400 });
  }

  // 라우팅 모드: scopedProject가 있으면 "scoped"(해당 프로젝트만),
  // 없으면 기존 key-prefix 기반 "legacy" 폴백.
  const mode: "scoped" | "legacy" = scopedProject ? "scoped" : "legacy";

  const keys = extractIssueKeys(pr.title, pr.head?.ref ?? "");
  if (keys.length === 0) {
    return NextResponse.json({ ok: true, matched: 0, mode, secretSource });
  }

  const status = mapPrStatus(payload.action, pr.merged, pr.state);
  const shouldCloseIssue = pr.merged; // 머지되면 연결된 이슈 상태를 DONE으로

  // PR 작성자를 DevTracker User로 매핑. 실패하면 reporter 폴백.
  const prAuthor = await resolvePullRequestAuthor(pr.user);

  let matched = 0;
  const skippedKeys: string[] = [];
  for (const { key, number } of keys) {
    let project: { id: string } | null;
    if (scopedProject) {
      // scoped 모드: 레포에 매핑된 프로젝트 키와 일치하는 이슈 키만 처리
      if (key !== scopedProject.key) {
        skippedKeys.push(`${key}-${number}`);
        continue;
      }
      project = { id: scopedProject.id };
    } else {
      project = await prisma.project.findFirst({
        where: { key },
        select: { id: true },
      });
    }
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
      // Activity userId: PR 작성자 매칭 성공 시 그 user, 실패 시 reporter 폴백
      await prisma.activity.create({
        data: {
          issueId: issue.id,
          userId: prAuthor?.id ?? issue.reporterId,
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: issue.status,
          newValue: "DONE",
        },
      });
    }

    matched++;
  }

  if (skippedKeys.length > 0) {
    console.info("[github-webhook] scoped 모드에서 프로젝트 외 키 스킵", {
      scoped: scopedProject?.key,
      repo: repoFullName,
      skipped: skippedKeys,
    });
  }

  return NextResponse.json({
    ok: true,
    matched,
    event,
    action: payload.action,
    mode,
    secretSource,
    prAuthorMatched: Boolean(prAuthor),
    ...(skippedKeys.length > 0 ? { skippedKeys } : {}),
  });
}
