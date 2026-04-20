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
  });
});
