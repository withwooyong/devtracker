import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";

test.describe("Journey: sonner 토스트 UI 검증", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("Toaster 컴포넌트가 DOM에 마운트된다", async ({ page }) => {
    // sonner의 Toaster는 section[aria-label*="Notifications"] 포털을 주입
    const toasterSection = page.locator("section[aria-label*='Notifications']");
    await expect(toasterSection).toBeAttached({ timeout: 5000 });
  });

  test("사용자 설정 저장 실패 시 토스트 에러가 표시된다", async ({ page }) => {
    // PATCH /api/auth/me 를 500으로 가로채기
    await page.route("**/api/auth/me", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "테스트용 강제 실패" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/settings");
    // githubLogin 필드에 값을 넣고 저장
    const input = page.locator("#user-github-login");
    await input.fill("test-verification");
    await page.locator('button[type="submit"]').click();

    // sonner 토스트는 li[data-sonner-toast] 요소로 렌더됨
    const toast = page.locator("li[data-sonner-toast]").filter({
      hasText: "테스트용 강제 실패",
    });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test("프로젝트 설정 저장 실패 시 토스트 에러가 표시된다", async ({ page }) => {
    // 첫 번째 프로젝트로 이동 (프로젝트 목록 페이지에서 첫 카드 클릭)
    await page.goto("/dashboard");
    const firstProjectLink = page.locator('a[href^="/projects/"]').first();
    const href = await firstProjectLink.getAttribute("href");
    if (!href) throw new Error("프로젝트 링크 없음");
    const projectKey = href.split("/")[2];

    // PATCH /api/projects/{projectKey} 를 500으로 가로채기
    await page.route(`**/api/projects/${projectKey}`, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "테스트용 프로젝트 저장 실패" }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto(`/projects/${projectKey}/settings`);
    const saveButton = page.locator('button[type="submit"]', {
      hasText: /저장/,
    });
    await saveButton.click();

    const toast = page.locator("li[data-sonner-toast]").filter({
      hasText: "테스트용 프로젝트 저장 실패",
    });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
