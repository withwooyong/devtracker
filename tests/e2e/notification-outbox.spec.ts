import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";
const CRON_SECRET = "cron-test-secret-for-local";

async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

test.describe("Journey 11: Notification Outbox", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("drain endpoint rejects unauthenticated requests", async ({
    playwright,
  }) => {
    const anon = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const res = await anon.get("/api/cron/notifications/drain");
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test("drain endpoint rejects invalid bearer token", async ({ playwright }) => {
    const anon = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const res = await anon.get("/api/cron/notifications/drain", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    expect(res.status()).toBe(401);
    await anon.dispose();
  });

  test("drain endpoint accepts valid CRON_SECRET and reports empty run", async ({
    playwright,
  }) => {
    const anon = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const res = await anon.get("/api/cron/notifications/drain", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(typeof json.processed).toBe("number");
    expect(typeof json.delivered).toBe("number");
    await anon.dispose();
  });

  test("issue assignment queues outbox row, drain delivers notification", async ({
    page,
    playwright,
  }) => {
    // Find a non-admin user to assign to (or fall back to admin self; no-self check skips same-user)
    const usersRes = await page.request.get("/api/users");
    const { users } = await usersRes.json();
    const other = users.find(
      (u: { email: string }) => u.email !== ADMIN_EMAIL
    );
    if (!other) test.skip(true, "No secondary user available to assign to");

    // Create issue assigned to the other user (admin is acting, assignee !== admin → triggers notification)
    // Note: admin uploads; assignee is other user → no self-filter skip
    // But createIssueAssignedTo triggers CREATED activity, not ISSUE_ASSIGNED which happens on PATCH.
    // So we: create with no assignee, then PATCH to assign. That triggers ISSUE_ASSIGNED notification.
    const createRes = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues`,
      {
        data: {
          title: `E2E-outbox-assign-${Date.now()}`,
          priority: "LOW",
          status: "TODO",
        },
      }
    );
    expect(createRes.status()).toBe(201);
    const { issue } = await createRes.json();

    const patchRes = await page.request.patch(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}`,
      { data: { assigneeId: other.id } }
    );
    expect(patchRes.status()).toBe(200);

    // Trigger drain
    const anon = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const drainRes = await anon.get("/api/cron/notifications/drain", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(drainRes.status()).toBe(200);
    const drain = await drainRes.json();
    expect(drain.delivered).toBeGreaterThanOrEqual(1);
    await anon.dispose();
  });
});
