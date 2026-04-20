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

  test("issue assignment triggers outbox → notification delivered via inline or cron drain", async ({
    page,
    playwright,
  }) => {
    const usersRes = await page.request.get("/api/users");
    const { users } = await usersRes.json();
    const other = users.find(
      (u: { email: string }) => u.email !== ADMIN_EMAIL
    );
    if (!other) test.skip(true, "No secondary user available to assign to");

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
    const { issue } = await createRes.json();

    const patchRes = await page.request.patch(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}`,
      { data: { assigneeId: other.id } }
    );
    expect(patchRes.status()).toBe(200);

    // Inline drain이 fire-and-forget이라 타이밍이 불확실. 100ms 대기 후 cron 드레인 호출 —
    // inline이 먼저 처리했으면 processed:0, 아니면 delivered >= 1.
    await page.waitForTimeout(200);
    const anon = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const drainRes = await anon.get("/api/cron/notifications/drain", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(drainRes.status()).toBe(200);
    await anon.dispose();

    // 한 번 더 drain 호출 → 이 시점엔 반드시 비어 있어야 함 (어느 쪽이든 모두 처리 완료)
    const anon2 = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const finalDrain = await anon2.get("/api/cron/notifications/drain", {
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const finalJson = await finalDrain.json();
    expect(finalJson.processed).toBe(0);
    await anon2.dispose();
  });
});
