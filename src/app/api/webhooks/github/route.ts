import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// 타이밍 공격 방지를 위한 상수 시간 비교.
// 길이가 다를 때 즉시 분기하면 "길이 부분만 맞는 접두어를 찾아가며 공격" 여지가 생긴다.
// 두 버퍼를 같은 최대 길이로 zero-pad 후 timingSafeEqual을 항상 실행하고,
// 최종적으로 원래 길이 동일성과 AND 해서 반환한다.
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  const maxLen = Math.max(aBuf.length, bBuf.length, 1);
  const aPad = Buffer.alloc(maxLen);
  const bPad = Buffer.alloc(maxLen);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  const sameBytes = crypto.timingSafeEqual(aPad, bPad);
  return sameBytes && aBuf.length === bBuf.length;
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

interface PushCommit {
  id: string;
  message: string;
  url: string;
}

interface PushPayload {
  ref?: string;
  deleted?: boolean;
  commits?: PushCommit[];
  repository?: { full_name: string };
}

interface ScopedProjectLite {
  id: string;
  key: string;
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

// scoped/legacy 공통 프로젝트 조회. scoped 모드는 key 불일치 시 null 반환(호출자가 skip 기록).
async function resolveProjectForKey(
  key: string,
  scopedProject: ScopedProjectLite | null
): Promise<{ id: string } | null> {
  if (scopedProject) {
    return key === scopedProject.key ? { id: scopedProject.id } : null;
  }
  return prisma.project.findFirst({ where: { key }, select: { id: true } });
}

async function handlePullRequest(
  payload: PullRequestPayload,
  scopedProject: ScopedProjectLite | null,
  mode: "scoped" | "legacy",
  secretSource: "project" | "global",
  repoFullName: string | null
) {
  const pr = payload.pull_request;
  if (!pr) {
    return NextResponse.json(
      { error: "pull_request 필드 누락" },
      { status: 400 }
    );
  }

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
    const project = await resolveProjectForKey(key, scopedProject);
    if (!project) {
      if (scopedProject) skippedKeys.push(`${key}-${number}`);
      continue;
    }

    const issue = await prisma.issue.findUnique({
      where: {
        projectId_issueNumber: { projectId: project.id, issueNumber: number },
      },
      select: { id: true, status: true, assigneeId: true, reporterId: true },
    });
    if (!issue) continue;

    await prisma.gitHubLink.upsert({
      where: { issueId_url: { issueId: issue.id, url: pr.html_url } },
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
      event: "pull_request",
      scoped: scopedProject?.key,
      repo: repoFullName,
      skipped: skippedKeys,
    });
  }

  return NextResponse.json({
    ok: true,
    matched,
    event: "pull_request",
    action: payload.action,
    mode,
    secretSource,
    prAuthorMatched: Boolean(prAuthor),
    ...(skippedKeys.length > 0 ? { skippedKeys } : {}),
  });
}

async function handlePush(
  payload: PushPayload,
  scopedProject: ScopedProjectLite | null,
  mode: "scoped" | "legacy",
  secretSource: "project" | "global",
  repoFullName: string | null
) {
  // 브랜치 삭제/force push로 commits가 비어있는 경우엔 연결 대상이 없음
  if (payload.deleted) {
    return NextResponse.json({
      ok: true,
      event: "push",
      skipped: "deleted",
      matched: 0,
      commits: 0,
      mode,
      secretSource,
    });
  }

  const commits = payload.commits ?? [];
  if (commits.length === 0) {
    return NextResponse.json({
      ok: true,
      event: "push",
      matched: 0,
      commits: 0,
      mode,
      secretSource,
    });
  }

  // 루프 진입 전 모든 commits의 이슈 키를 모아 project 조회를 1회로 묶는다(legacy N+1 방지).
  const commitsWithKeys = commits.map((c) => ({
    commit: c,
    keys: extractIssueKeys(c.message),
    // 커밋 메시지 1줄 요약을 title로 사용 (GitHubLink.title에 맞춰 200자 제한)
    title:
      c.message.split("\n", 1)[0].slice(0, 200) || c.id.slice(0, 7),
  }));
  const uniqueKeys = Array.from(
    new Set(commitsWithKeys.flatMap(({ keys }) => keys.map((k) => k.key)))
  );

  const projectMap = new Map<string, { id: string }>();
  if (uniqueKeys.length > 0) {
    if (scopedProject) {
      if (uniqueKeys.includes(scopedProject.key)) {
        projectMap.set(scopedProject.key, { id: scopedProject.id });
      }
    } else {
      const projects = await prisma.project.findMany({
        where: { key: { in: uniqueKeys } },
        select: { id: true, key: true },
      });
      for (const p of projects) projectMap.set(p.key, { id: p.id });
    }
  }

  let matched = 0;
  const skippedKeys = new Set<string>();

  for (const { commit, keys, title } of commitsWithKeys) {
    for (const { key, number } of keys) {
      const project = projectMap.get(key) ?? null;
      if (!project) {
        if (scopedProject) skippedKeys.add(`${key}-${number}`);
        continue;
      }

      const issue = await prisma.issue.findUnique({
        where: {
          projectId_issueNumber: { projectId: project.id, issueNumber: number },
        },
        select: { id: true },
      });
      if (!issue) continue;

      // 중복 push 재전송 또는 rebase로 인한 재송신에도 안전하도록 (issueId,url) 기준 upsert.
      // 커밋에는 자연스러운 status가 없어 null로 둔다(PR과 구분).
      await prisma.gitHubLink.upsert({
        where: { issueId_url: { issueId: issue.id, url: commit.url } },
        update: { title, externalId: commit.id },
        create: {
          issueId: issue.id,
          type: "COMMIT",
          url: commit.url,
          title,
          status: null,
          externalId: commit.id,
        },
      });
      matched++;
    }
  }

  const skippedList = Array.from(skippedKeys);
  if (skippedList.length > 0) {
    console.info("[github-webhook] scoped 모드에서 프로젝트 외 키 스킵", {
      event: "push",
      scoped: scopedProject?.key,
      repo: repoFullName,
      skipped: skippedList,
    });
  }

  return NextResponse.json({
    ok: true,
    event: "push",
    matched,
    commits: commits.length,
    mode,
    secretSource,
    ...(skippedList.length > 0 ? { skippedKeys: skippedList } : {}),
  });
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
  let parsedBody:
    | PullRequestPayload
    | PushPayload
    | { repository?: { full_name: string } }
    | null = null;
  try {
    parsedBody = JSON.parse(rawBody) as PullRequestPayload | PushPayload;
  } catch {
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

  const mode: "scoped" | "legacy" = scopedProject ? "scoped" : "legacy";
  const lite: ScopedProjectLite | null = scopedProject
    ? { id: scopedProject.id, key: scopedProject.key }
    : null;

  if (event === "pull_request") {
    const payload = parsedBody as PullRequestPayload | null;
    if (!payload) {
      return NextResponse.json(
        { error: "JSON 파싱에 실패했습니다." },
        { status: 400 }
      );
    }
    return handlePullRequest(payload, lite, mode, secretSource, repoFullName);
  }

  if (event === "push") {
    const payload = parsedBody as PushPayload | null;
    if (!payload) {
      return NextResponse.json(
        { error: "JSON 파싱에 실패했습니다." },
        { status: 400 }
      );
    }
    return handlePush(payload, lite, mode, secretSource, repoFullName);
  }

  return NextResponse.json({ ok: true, skipped: event });
}
