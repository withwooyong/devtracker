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
      title: `E2E-gh-badges-${Date.now()}`,
      priority: "LOW",
      status: "TODO",
    },
  });
  expect(res.status()).toBe(201);
  const { issue } = await res.json();
  return issue as { id: string; issueNumber: number };
}

async function sendWebhook(
  page: Page,
  event: "pull_request" | "push",
  body: string
) {
  return page.request.post("/api/webhooks/github", {
    headers: {
      "x-github-event": event,
      "x-hub-signature-256": signBody(body),
      "content-type": "application/json",
    },
    data: body,
  });
}

test.describe("Journey 15: GitHubLink type 배지 렌더링", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("PR 링크는 'PR' 배지와 #번호 힌트로 표시된다", async ({ page }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const prNumber = Math.floor(Math.random() * 1e9);

    const body = JSON.stringify({
      action: "opened",
      pull_request: {
        number: prNumber,
        title: `[${issueKey}] 배지 렌더링 확인`,
        html_url: `https://github.com/example/repo/pull/${prNumber}`,
        merged: false,
        state: "open",
        head: { ref: `feature/${issueKey.toLowerCase()}` },
      },
      repository: { full_name: "example/repo" },
    });
    const res = await sendWebhook(page, "pull_request", body);
    expect(res.status()).toBe(200);

    await page.goto(
      `/projects/${PROJECT_KEY}/issues/${issue.issueNumber}`
    );

    const section = page.getByTestId("github-link-section");
    await expect(section).toBeVisible();
    // PR 배지
    await expect(section.getByText("PR", { exact: true }).first()).toBeVisible();
    // #번호 힌트
    await expect(section.getByText(`#${prNumber}`, { exact: true })).toBeVisible();
    // 제목 링크
    await expect(
      section.getByRole("link", {
        name: `[${issueKey}] 배지 렌더링 확인`,
      })
    ).toBeVisible();
  });

  test("COMMIT 링크는 '커밋' 배지와 SHA 7자 힌트로 표시된다", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const issueKey = `${PROJECT_KEY}-${issue.issueNumber}`;
    const sha = crypto.randomBytes(20).toString("hex"); // 40자 SHA

    const body = JSON.stringify({
      ref: "refs/heads/main",
      deleted: false,
      commits: [
        {
          id: sha,
          message: `[${issueKey}] 작은 리팩터`,
          url: `https://github.com/example/repo/commit/${sha}`,
        },
      ],
      repository: { full_name: "example/repo" },
    });
    const res = await sendWebhook(page, "push", body);
    expect(res.status()).toBe(200);

    await page.goto(
      `/projects/${PROJECT_KEY}/issues/${issue.issueNumber}`
    );

    const section = page.getByTestId("github-link-section");
    await expect(section).toBeVisible();
    // COMMIT 배지 레이블은 "커밋"
    await expect(
      section.getByText("커밋", { exact: true }).first()
    ).toBeVisible();
    // SHA 앞 7자 힌트
    await expect(section.getByText(sha.slice(0, 7), { exact: true })).toBeVisible();
    // 제목 링크
    await expect(
      section.getByRole("link", { name: `[${issueKey}] 작은 리팩터` })
    ).toBeVisible();
  });
});
