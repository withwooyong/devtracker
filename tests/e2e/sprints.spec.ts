import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";

async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

function uniqueSprintName() {
  return `E2E-스프린트-${Date.now()}`;
}

function isoDate(daysFromToday: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

test.describe("Journey 8: Sprint Lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("navigates to sprints tab from project page", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);
    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});

    await page.getByRole("link", { name: "스프린트" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/projects/${PROJECT_KEY}/sprints$`)
    );
    await expect(
      page.getByRole("link", { name: "스프린트 생성" })
    ).toBeVisible();
  });

  test("can create a sprint and it appears in the list", async ({ page }) => {
    const sprintName = uniqueSprintName();

    await page.goto(`/projects/${PROJECT_KEY}/sprints/new`);

    await page
      .locator('input[placeholder*="스프린트"]')
      .fill(sprintName);
    await page
      .locator('textarea[placeholder*="목표"]')
      .fill("E2E 테스트로 생성한 스프린트");
    await page.locator('input[type="date"]').nth(0).fill(isoDate(0));
    await page.locator('input[type="date"]').nth(1).fill(isoDate(7));

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().endsWith("/sprints") &&
          resp.request().method() === "POST",
        { timeout: 10000 }
      ),
      page.getByRole("button", { name: "생성" }).click(),
    ]);
    expect(response.status()).toBe(201);

    await expect(page).toHaveURL(
      new RegExp(`/projects/${PROJECT_KEY}/sprints$`)
    );
    await expect(page.getByText(sprintName).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("rejects invalid date range", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/sprints/new`);

    await page
      .locator('input[placeholder*="스프린트"]')
      .fill(uniqueSprintName());
    await page.locator('input[type="date"]').nth(0).fill(isoDate(7));
    await page.locator('input[type="date"]').nth(1).fill(isoDate(0));

    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().endsWith("/sprints") &&
          resp.request().method() === "POST",
        { timeout: 10000 }
      ),
      page.getByRole("button", { name: "생성" }).click(),
    ]);
    expect(response.status()).toBe(400);

    // Error message should surface in the form
    await expect(
      page.getByText(/종료일은 시작일 이후여야 합니다/)
    ).toBeVisible({ timeout: 5000 });
  });

  test("sprint detail page shows status controls", async ({ page }) => {
    // Create a sprint first
    const sprintName = uniqueSprintName();
    const createResp = await page.request.post(
      `/api/projects/${PROJECT_KEY}/sprints`,
      {
        data: {
          name: sprintName,
          startDate: isoDate(0),
          endDate: isoDate(7),
        },
      }
    );
    expect(createResp.status()).toBe(201);
    const { sprint } = await createResp.json();

    await page.goto(`/projects/${PROJECT_KEY}/sprints/${sprint.id}`);
    await expect(page.getByText(sprintName).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "스프린트 시작" })
    ).toBeVisible();

    // Cleanup
    await page.request.delete(
      `/api/projects/${PROJECT_KEY}/sprints/${sprint.id}`
    );
  });

  test("starting a sprint transitions PLANNED → ACTIVE", async ({ page }) => {
    const sprintName = uniqueSprintName();
    const createResp = await page.request.post(
      `/api/projects/${PROJECT_KEY}/sprints`,
      {
        data: {
          name: sprintName,
          startDate: isoDate(0),
          endDate: isoDate(7),
        },
      }
    );
    const { sprint } = await createResp.json();

    await page.goto(`/projects/${PROJECT_KEY}/sprints/${sprint.id}`);

    const startButton = page.getByRole("button", { name: "스프린트 시작" });
    await expect(startButton).toBeVisible();

    const [patchResp] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes(`/sprints/${sprint.id}`) &&
          resp.request().method() === "PATCH",
        { timeout: 10000 }
      ),
      startButton.click(),
    ]);
    expect(patchResp.status()).toBe(200);

    await expect(
      page.getByRole("button", { name: "스프린트 완료" })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("진행 중").first()).toBeVisible();

    // Cleanup
    await page.request.delete(
      `/api/projects/${PROJECT_KEY}/sprints/${sprint.id}`
    );
  });

  test("deleting a sprint redirects to list and removes it", async ({
    page,
  }) => {
    const sprintName = uniqueSprintName();
    const createResp = await page.request.post(
      `/api/projects/${PROJECT_KEY}/sprints`,
      {
        data: {
          name: sprintName,
          startDate: isoDate(0),
          endDate: isoDate(7),
        },
      }
    );
    const { sprint } = await createResp.json();

    await page.goto(`/projects/${PROJECT_KEY}/sprints/${sprint.id}`);

    page.once("dialog", (dialog) => dialog.accept());
    const [deleteResp] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes(`/sprints/${sprint.id}`) &&
          resp.request().method() === "DELETE",
        { timeout: 10000 }
      ),
      page.getByRole("button", { name: "삭제" }).click(),
    ]);
    expect(deleteResp.status()).toBe(200);

    await expect(page).toHaveURL(
      new RegExp(`/projects/${PROJECT_KEY}/sprints$`)
    );
  });
});
