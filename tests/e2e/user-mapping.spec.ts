import { test, expect, type Page } from "@playwright/test";
import crypto from "crypto";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const MEMBER_EMAIL = "kookyh@yanadoocorp.com"; // Harrison (seed)
const MEMBER_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";
const WEBHOOK_SECRET = "test-secret-for-local-dev";

async function loginAs(page: Page, email: string, password: string) {
  const res = await page.request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(res.status()).toBe(200);
}

function signBody(body: string) {
  return (
    "sha256=" +
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
  );
}

async function ensureIssue(page: Page) {
  const res = await page.request.post(`/api/projects/${PROJECT_KEY}/issues`, {
    data: {
      title: `E2E-user-mapping-${Date.now()}`,
      priority: "LOW",
      status: "TODO",
    },
  });
  expect(res.status()).toBe(201);
  const { issue } = await res.json();
  return issue as { id: string; issueNumber: number };
}

function buildMergedPayload(options: {
  issueKey: string;
  prNumber: number;
  userLogin: string;
  userId: number;
}) {
  return {
    action: "closed",
    pull_request: {
      number: options.prNumber,
      title: `[${options.issueKey}] mapped author`,
      html_url: `https://github.com/example/repo/pull/${options.prNumber}`,
      merged: true,
      state: "closed",
      head: { ref: `feature/${options.issueKey.toLowerCase()}` },
      user: { login: options.userLogin, id: options.userId },
    },
    repository: { full_name: "example/repo" },
  };
}

// Unique suffix so parallel runs don't collide on unique(githubLogin/githubId)
const RUN_ID = Date.now().toString(36);
const TED_LOGIN = `e2e-ted-${RUN_ID}`;
const HARRISON_LOGIN = `e2e-harrison-${RUN_ID}`;
const HARRISON_GH_ID = 9_000_000 + Math.floor(Math.random() * 100_000);
const UNKNOWN_LOGIN = `e2e-nobody-${RUN_ID}`;

test.describe("Journey 13: GitHub User Mapping", () => {
  test.beforeAll(async ({ playwright, baseURL }) => {
    // 독립 세션으로 두 사용자의 githubLogin을 설정
    const ctx = await playwright.request.newContext({
      baseURL: baseURL ?? "http://localhost:3000",
    });
    try {
      await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      const r1 = await ctx.patch("/api/auth/me", {
        data: { githubLogin: TED_LOGIN },
      });
      expect(r1.status()).toBe(200);
    } finally {
      await ctx.dispose();
    }

    const ctx2 = await playwright.request.newContext({
      baseURL: baseURL ?? "http://localhost:3000",
    });
    try {
      await ctx2.post("/api/auth/login", {
        data: { email: MEMBER_EMAIL, password: MEMBER_PASSWORD },
      });
      const r2 = await ctx2.patch("/api/auth/me", {
        data: { githubLogin: HARRISON_LOGIN },
      });
      expect(r2.status()).toBe(200);
    } finally {
      await ctx2.dispose();
    }
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    // 복원 — 이후 스펙/세션에 영향 없도록 githubLogin 해제
    for (const [email, pw] of [
      [ADMIN_EMAIL, ADMIN_PASSWORD],
      [MEMBER_EMAIL, MEMBER_PASSWORD],
    ] as const) {
      const ctx = await playwright.request.newContext({
        baseURL: baseURL ?? "http://localhost:3000",
      });
      try {
        await ctx.post("/api/auth/login", { data: { email, password: pw } });
        const res = await ctx.patch("/api/auth/me", {
          data: { githubLogin: "" },
        });
        expect(res.status()).toBe(200);
      } finally {
        await ctx.dispose();
      }
    }
  });

  test("PATCH /api/auth/me 라운드트립으로 githubLogin이 반영된다", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await page.request.get("/api/auth/me");
    expect(res.status()).toBe(200);
    const { user } = await res.json();
    expect(user.githubLogin).toBe(TED_LOGIN);
  });

  test("중복 githubLogin 등록은 409", async ({ page }) => {
    await loginAs(page, MEMBER_EMAIL, MEMBER_PASSWORD);
    const res = await page.request.patch("/api/auth/me", {
      data: { githubLogin: TED_LOGIN },
    });
    expect(res.status()).toBe(409);
  });

  test("잘못된 형식의 githubLogin은 400", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await page.request.patch("/api/auth/me", {
      data: { githubLogin: "-invalid-leading-dash" },
    });
    expect(res.status()).toBe(400);
  });

  test("매핑된 PR 작성자로 머지된 webhook은 매핑된 user의 Activity를 남긴다", async ({
    page,
  }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now() + 10;

    const body = JSON.stringify(
      buildMergedPayload({
        issueKey,
        prNumber,
        userLogin: HARRISON_LOGIN,
        userId: HARRISON_GH_ID,
      })
    );

    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.prAuthorMatched).toBe(true);
    expect(json.matched).toBe(1);

    // STATUS_CHANGED Activity가 Harrison 명의로 기록되었는지 확인
    const actRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.issueNumber}/activities`
    );
    const { activities } = await actRes.json();
    const statusChanged = activities.find(
      (a: { action: string }) => a.action === "STATUS_CHANGED"
    );
    expect(statusChanged).toBeTruthy();
    expect(statusChanged.user.name).toBe("Harrison");
    expect(statusChanged.user.email).toBe(MEMBER_EMAIL);
  });

  test("알 수 없는 PR 작성자는 reporter 폴백으로 기록된다", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now() + 20;

    const body = JSON.stringify(
      buildMergedPayload({
        issueKey,
        prNumber,
        userLogin: UNKNOWN_LOGIN,
        userId: 999_999_999,
      })
    );

    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.prAuthorMatched).toBe(false);
    expect(json.matched).toBe(1);

    // STATUS_CHANGED Activity의 userName은 reporter인 Ted
    const actRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.issueNumber}/activities`
    );
    const { activities } = await actRes.json();
    const statusChanged = activities.find(
      (a: { action: string }) => a.action === "STATUS_CHANGED"
    );
    expect(statusChanged).toBeTruthy();
    expect(statusChanged.user.email).toBe(ADMIN_EMAIL);
  });

  test("login 매칭된 PR이 들어오면 githubId가 자동으로 저장된다", async ({
    page,
  }) => {
    // 첫 번째 매칭 테스트에서 이미 Harrison의 githubId가 HARRISON_GH_ID로 저장됐어야 한다.
    // 다른 login으로 같은 id를 사용하는 PR이 와도 id 매칭이 우선이어야 함.
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now() + 30;

    const body = JSON.stringify(
      buildMergedPayload({
        issueKey,
        prNumber,
        userLogin: "changed-login-that-does-not-exist",
        userId: HARRISON_GH_ID,
      })
    );

    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.prAuthorMatched).toBe(true);

    const actRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.issueNumber}/activities`
    );
    const { activities } = await actRes.json();
    const statusChanged = activities.find(
      (a: { action: string }) => a.action === "STATUS_CHANGED"
    );
    expect(statusChanged).toBeTruthy();
    expect(statusChanged.user.email).toBe(MEMBER_EMAIL); // githubId 폴백으로 여전히 Harrison
  });
});
