import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

test.describe("Journey 12: Project Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("project page exposes 설정 tab", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);
    await expect(page.getByRole("link", { name: "설정", exact: true })).toBeVisible();
  });

  test("settings page loads with existing description and githubRepo for admin", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_KEY}/settings`);
    await expect(
      page.getByRole("heading", { name: new RegExp(`${PROJECT_KEY}|설정`) })
    ).toBeVisible();
    await expect(page.getByLabel("GitHub 레포지토리")).toBeVisible();
    await expect(page.getByLabel("설명")).toBeVisible();
    await expect(page.getByRole("button", { name: "저장" })).toBeEnabled();
  });

  test("updating githubRepo with valid owner/repo format succeeds", async ({
    page,
  }) => {
    const marker = `tester/devtracker-${Date.now().toString(36)}`;

    await page.goto(`/projects/${PROJECT_KEY}/settings`);
    await page.getByLabel("GitHub 레포지토리").fill(marker);
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page.getByText("저장되었습니다.")).toBeVisible({
      timeout: 5000,
    });

    await page.reload();
    await expect(page.getByLabel("GitHub 레포지토리")).toHaveValue(marker);

    // cleanup
    await page.getByLabel("GitHub 레포지토리").fill("");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText("저장되었습니다.")).toBeVisible({
      timeout: 5000,
    });
  });

  test("invalid githubRepo format is rejected with Korean error", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_KEY}/settings`);
    await page.getByLabel("GitHub 레포지토리").fill("invalid repo with spaces");
    await page.getByRole("button", { name: "저장" }).click();
    await expect(page.getByText(/owner\/repo 형식/)).toBeVisible({
      timeout: 5000,
    });
  });

  test("PATCH API rejects unauthenticated requests with 401", async ({
    playwright,
  }) => {
    const ctx = await playwright.request.newContext();
    const res = await ctx.patch(
      `http://localhost:3000/api/projects/${PROJECT_KEY}`,
      {
        data: { description: "해커" },
      }
    );
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });
});
