import { test, expect, type Page } from "@playwright/test";
import crypto from "crypto";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";
const WEBHOOK_SECRET = "test-secret-for-local-dev";

async function loginViaApi(page: Page) {
  const res = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
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
      title: `E2E-github-push-${Date.now()}`,
      priority: "LOW",
      status: "TODO",
    },
  });
  expect(res.status()).toBe(201);
  const { issue } = await res.json();
  return issue as { id: string; issueNumber: number };
}

function buildCommit(options: {
  sha?: string;
  message: string;
  prefix?: string;
}) {
  const sha =
    options.sha ??
    crypto.randomBytes(20).toString("hex"); // 40-hex like real GitHub SHA
  return {
    id: sha,
    message: options.message,
    url: `https://github.com/example/repo/commit/${sha}`,
  };
}

function buildPushPayload(options: {
  commits: Array<{ id: string; message: string; url: string }>;
  repoFullName?: string;
  deleted?: boolean;
  ref?: string;
}) {
  return {
    ref: options.ref ?? "refs/heads/main",
    deleted: options.deleted ?? false,
    commits: options.commits,
    repository: { full_name: options.repoFullName ?? "example/repo" },
  };
}

test.describe("Journey 14: GitHub Push Webhook", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("이슈 키 포함 commit은 GitHubLink(type=COMMIT)로 연결된다", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const commit = buildCommit({
      message: `[${issueKey}] 작은 리팩터`,
    });

    const body = JSON.stringify(buildPushPayload({ commits: [commit] }));
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "push",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.event).toBe("push");
    expect(json.matched).toBe(1);
    expect(json.commits).toBe(1);
    expect(json.mode).toBe("legacy");

    const linksRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/github-links`
    );
    const { githubLinks } = await linksRes.json();
    const commitLink = githubLinks.find(
      (l: { type: string; externalId: string }) =>
        l.type === "COMMIT" && l.externalId === commit.id
    );
    expect(commitLink).toBeTruthy();
    expect(commitLink.url).toBe(commit.url);
    expect(commitLink.status).toBeNull();
  });

  test("동일 push를 재전송해도 GitHubLink가 중복 생성되지 않는다", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const commit = buildCommit({
      message: `[${issueKey}] dedup 테스트`,
    });

    const body = JSON.stringify(buildPushPayload({ commits: [commit] }));
    const headers = {
      "x-github-event": "push",
      "x-hub-signature-256": signBody(body),
      "content-type": "application/json",
    };
    await page.request.post("/api/webhooks/github", { headers, data: body });
    const second = await page.request.post("/api/webhooks/github", {
      headers,
      data: body,
    });
    expect(second.status()).toBe(200);

    const linksRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/github-links`
    );
    const { githubLinks } = await linksRes.json();
    const matches = githubLinks.filter(
      (l: { externalId: string }) => l.externalId === commit.id
    );
    expect(matches).toHaveLength(1);
  });

  test("다중 commit이 각각 별개 링크로 생성된다", async ({ page }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const commits = [
      buildCommit({ message: `[${issueKey}] step 1` }),
      buildCommit({ message: `[${issueKey}] step 2` }),
      buildCommit({ message: `chore: no issue key here` }),
    ];

    const body = JSON.stringify(buildPushPayload({ commits }));
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "push",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.commits).toBe(3);
    expect(json.matched).toBe(2);

    const linksRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/github-links`
    );
    const { githubLinks } = await linksRes.json();
    const commitLinks = githubLinks.filter(
      (l: { type: string; externalId: string }) =>
        l.type === "COMMIT" &&
        (l.externalId === commits[0].id || l.externalId === commits[1].id)
    );
    expect(commitLinks).toHaveLength(2);
  });

  test("deleted push는 skipped로 응답하고 링크를 만들지 않는다", async ({
    page,
  }) => {
    const body = JSON.stringify(
      buildPushPayload({ commits: [], deleted: true })
    );
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "push",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.skipped).toBe("deleted");
  });

  test("빈 commits 배열은 matched=0으로 조용히 통과한다", async ({ page }) => {
    const body = JSON.stringify(buildPushPayload({ commits: [] }));
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "push",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.matched).toBe(0);
  });
});

test.describe("Journey 14b: Push Webhook — scoped 모드 cross-project 스킵", () => {
  const SCOPED_REPO = "e2e-push-scoped-owner/e2e-push-scoped-repo";

  async function setGithubRepo(
    playwright: import("@playwright/test").PlaywrightWorkerArgs["playwright"],
    baseURL: string,
    value: string
  ) {
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
    await setGithubRepo(
      playwright,
      baseURL ?? "http://localhost:3000",
      SCOPED_REPO
    );
  });

  test.afterAll(async ({ playwright, baseURL }) => {
    await setGithubRepo(playwright, baseURL ?? "http://localhost:3000", "");
  });

  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("scoped 모드: 매핑된 프로젝트 키의 commit만 링크되고 외부 키는 skippedKeys", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const devKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const commits = [
      buildCommit({ message: `[${devKey}] scoped ok` }),
      buildCommit({ message: `[OPS-999] should be skipped in scoped` }),
    ];

    const body = JSON.stringify(
      buildPushPayload({ commits, repoFullName: SCOPED_REPO })
    );
    const res = await page.request.post("/api/webhooks/github", {
      headers: {
        "x-github-event": "push",
        "x-hub-signature-256": signBody(body),
        "content-type": "application/json",
      },
      data: body,
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.mode).toBe("scoped");
    expect(json.matched).toBe(1);
    expect(json.skippedKeys).toEqual(["OPS-999"]);
  });
});
