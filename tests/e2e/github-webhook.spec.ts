import { test, expect } from "@playwright/test";
import crypto from "crypto";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";
const WEBHOOK_SECRET = "test-secret-for-local-dev";

async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

function signBody(body: string) {
  return (
    "sha256=" +
    crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
  );
}

async function ensureIssue(page: import("@playwright/test").Page) {
  const res = await page.request.post(
    `/api/projects/${PROJECT_KEY}/issues`,
    {
      data: {
        title: `E2E-github-${Date.now()}`,
        priority: "LOW",
        status: "TODO",
      },
    }
  );
  expect(res.status()).toBe(201);
  const { issue } = await res.json();
  return issue as { id: string; issueNumber: number };
}

function buildPrPayload(options: {
  issueKey: string;
  prNumber?: number;
  action: string;
  merged?: boolean;
  state?: string;
}) {
  return {
    action: options.action,
    pull_request: {
      number: options.prNumber ?? Math.floor(Math.random() * 100000),
      title: `[${options.issueKey}] Fix something broken`,
      html_url: `https://github.com/example/repo/pull/${options.prNumber ?? 1}`,
      merged: options.merged ?? false,
      state: options.state ?? "open",
      head: { ref: `feature/${options.issueKey.toLowerCase()}-branch` },
    },
    repository: { full_name: "example/repo" },
  };
}

test.describe("Journey 10: GitHub Webhook", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("webhook is reachable without auth cookie (GitHub has no cookies)", async ({
    playwright,
  }) => {
    // Use a fresh request context without login cookies to simulate real GitHub call
    const ctx = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const body = JSON.stringify({ zen: "hello" });
    const res = await ctx.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "ping",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test("rejects requests with invalid signature", async ({ page }) => {
    const body = JSON.stringify({ action: "opened" });
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": "sha256=invalid",
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(401);
  });

  test("accepts ping event", async ({ page }) => {
    const body = JSON.stringify({ zen: "hello" });
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "ping",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  test("PR opened with issue key creates GitHubLink", async ({ page }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now();

    const payload = buildPrPayload({
      issueKey,
      prNumber,
      action: "opened",
      state: "open",
    });
    const body = JSON.stringify(payload);

    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const { matched } = await res.json();
    expect(matched).toBe(1);

    const linksRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/github-links`
    );
    const { githubLinks } = await linksRes.json();
    expect(githubLinks).toHaveLength(1);
    expect(githubLinks[0].status).toBe("open");
    expect(githubLinks[0].externalId).toBe(String(prNumber));
  });

  test("PR merge transitions issue to DONE", async ({ page }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now();

    // open
    const openedBody = JSON.stringify(
      buildPrPayload({
        issueKey,
        prNumber,
        action: "opened",
        state: "open",
      })
    );
    await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signBody(openedBody),
        "content-type": "application/json",
      },
      data: openedBody,
    });

    // merged
    const mergedBody = JSON.stringify(
      buildPrPayload({
        issueKey,
        prNumber,
        action: "closed",
        merged: true,
        state: "closed",
      })
    );
    const mergeRes = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signBody(mergedBody),
        "content-type": "application/json",
      },
      data: mergedBody,
    });
    expect(mergeRes.status()).toBe(200);

    // Issue status should now be DONE
    const issueRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.issueNumber}`
    );
    const { issue: updated } = await issueRes.json();
    expect(updated.status).toBe("DONE");

    // GitHubLink status updated to merged
    const linksRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/github-links`
    );
    const { githubLinks } = await linksRes.json();
    expect(githubLinks[0].status).toBe("merged");
  });

  test("PR without issue key is acknowledged but not linked", async ({
    page,
  }) => {
    const body = JSON.stringify({
      action: "opened",
      pull_request: {
        number: 999,
        title: "No issue reference here",
        html_url: "https://github.com/example/repo/pull/999",
        merged: false,
        state: "open",
        head: { ref: "feature/random-branch" },
      },
      repository: { full_name: "example/repo" },
    });

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
    expect(json.matched).toBe(0);
    expect(json.mode).toBe("legacy");
  });
});

test.describe("Journey 10b: GitHub Webhook — Hybrid Routing (scoped)", () => {
  const SCOPED_REPO = "e2e-hybrid-owner/e2e-hybrid-repo";

  async function setGithubRepo(
    playwright: import("@playwright/test").PlaywrightWorkerArgs["playwright"],
    baseURL: string,
    value: string
  ) {
    // 독립 APIRequestContext로 격리된 로그인+patch. beforeAll/afterAll의 쿠키 공유 불확실성 회피.
    const ctx = await playwright.request.newContext({ baseURL });
    try {
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      expect(loginRes.status()).toBe(200);
      const res = await ctx.patch(`/api/projects/${PROJECT_KEY}`, {
        data: { githubRepo: value },
      });
      expect(res.status()).toBe(200);
    } finally {
      await ctx.dispose();
    }
  }

  test.beforeAll(async ({ playwright, baseURL }) => {
    await setGithubRepo(playwright, baseURL ?? "http://localhost:3000", SCOPED_REPO);
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    // 복원 실패 시 Journey 10 legacy 테스트가 깨지므로 반드시 검증
    await setGithubRepo(playwright, baseURL ?? "http://localhost:3000", "");
  });

  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("scoped mode: matching repo routes to the mapped project", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now();

    const payload = {
      action: "opened",
      pull_request: {
        number: prNumber,
        title: `[${issueKey}] scoped routing test`,
        html_url: `https://github.com/${SCOPED_REPO}/pull/${prNumber}`,
        merged: false,
        state: "open",
        head: { ref: `feature/${issueKey.toLowerCase()}` },
      },
      repository: { full_name: SCOPED_REPO },
    };
    const body = JSON.stringify(payload);

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
    expect(json.mode).toBe("scoped");
    expect(json.matched).toBe(1);
  });

  test("scoped mode: PR with non-mapped project key is ignored", async ({
    page,
  }) => {
    const prNumber = Date.now() + 1;
    // scoped project는 DEV인데 PR 제목에는 OPS 키만 포함 → 매칭 안 됨
    const payload = {
      action: "opened",
      pull_request: {
        number: prNumber,
        title: "[OPS-999] should not touch OPS from DEV-mapped repo",
        html_url: `https://github.com/${SCOPED_REPO}/pull/${prNumber}`,
        merged: false,
        state: "open",
        head: { ref: "feature/ops-999" },
      },
      repository: { full_name: SCOPED_REPO },
    };
    const body = JSON.stringify(payload);

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
    expect(json.mode).toBe("scoped");
    expect(json.matched).toBe(0);
  });

  test("scoped mode: cross-project PR only touches the mapped project", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const devKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now() + 2;

    const payload = {
      action: "opened",
      pull_request: {
        number: prNumber,
        title: `[${devKey}] and [OPS-999] cross-project`,
        html_url: `https://github.com/${SCOPED_REPO}/pull/${prNumber}`,
        merged: false,
        state: "open",
        head: { ref: `feature/${devKey.toLowerCase()}-ops-999` },
      },
      repository: { full_name: SCOPED_REPO },
    };
    const body = JSON.stringify(payload);

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
    expect(json.mode).toBe("scoped");
    // DEV-N만 매칭, OPS-999는 scoped에서 제외
    expect(json.matched).toBe(1);
  });
});

test.describe("Journey 10c: GitHub Webhook — 프로젝트별 secret", () => {
  const SCOPED_REPO = "e2e-secret-owner/e2e-secret-repo";
  const PROJECT_SECRET = "project-specific-secret-for-e2e-32chars";

  async function patchProject(
    playwright: import("@playwright/test").PlaywrightWorkerArgs["playwright"],
    baseURL: string,
    body: Record<string, unknown>
  ) {
    const ctx = await playwright.request.newContext({ baseURL });
    try {
      const loginRes = await ctx.post("/api/auth/login", {
        data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      });
      expect(loginRes.status()).toBe(200);
      const res = await ctx.patch(`/api/projects/${PROJECT_KEY}`, {
        data: body,
      });
      expect(res.status()).toBe(200);
      return res.json();
    } finally {
      await ctx.dispose();
    }
  }

  function signWith(secret: string, body: string) {
    return (
      "sha256=" +
      crypto.createHmac("sha256", secret).update(body).digest("hex")
    );
  }

  test.beforeAll(async ({ playwright, baseURL }) => {
    await patchProject(playwright, baseURL ?? "http://localhost:3000", {
      githubRepo: SCOPED_REPO,
      githubWebhookSecret: PROJECT_SECRET,
    });
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    // 복원: 이후 Journey 10/10b가 전역 secret으로 검증하도록 되돌린다.
    await patchProject(playwright, baseURL ?? "http://localhost:3000", {
      githubRepo: "",
      githubWebhookSecret: "",
    });
  });

  test("PATCH 응답은 secret 원문을 반환하지 않고 'set' 플래그만 노출", async ({
    page,
  }) => {
    await loginViaApi(page);
    const res = await page.request.get(`/api/projects/${PROJECT_KEY}`);
    expect(res.status()).toBe(200);
    const { project } = await res.json();
    expect(project.githubWebhookSecretSet).toBe(true);
    expect(project).not.toHaveProperty("githubWebhookSecret");
  });

  test("프로젝트 secret으로 서명된 요청은 통과하고 secretSource=project", async ({
    page,
  }) => {
    await loginViaApi(page);
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Date.now() + 100;

    const payload = {
      action: "opened",
      pull_request: {
        number: prNumber,
        title: `[${issueKey}] project secret routing`,
        html_url: `https://github.com/${SCOPED_REPO}/pull/${prNumber}`,
        merged: false,
        state: "open",
        head: { ref: `feature/${issueKey.toLowerCase()}` },
      },
      repository: { full_name: SCOPED_REPO },
    };
    const body = JSON.stringify(payload);

    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        "x-hub-signature-256": signWith(PROJECT_SECRET, body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.mode).toBe("scoped");
    expect(json.secretSource).toBe("project");
    expect(json.matched).toBe(1);
  });

  test("프로젝트 secret이 설정되었을 때 전역 secret으로 서명된 요청은 401", async ({
    page,
  }) => {
    await loginViaApi(page);
    const prNumber = Date.now() + 200;

    const payload = {
      action: "opened",
      pull_request: {
        number: prNumber,
        title: `[${PROJECT_KEY}-1] global secret should be rejected`,
        html_url: `https://github.com/${SCOPED_REPO}/pull/${prNumber}`,
        merged: false,
        state: "open",
        head: { ref: `feature/${PROJECT_KEY.toLowerCase()}-1` },
      },
      repository: { full_name: SCOPED_REPO },
    };
    const body = JSON.stringify(payload);

    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "pull_request",
        // 전역 WEBHOOK_SECRET로 서명 — 프로젝트 secret이 설정된 레포이므로 거부되어야 함
        "x-hub-signature-256": signWith(WEBHOOK_SECRET, body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(401);
  });
});
