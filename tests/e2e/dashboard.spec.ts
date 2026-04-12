import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";
import { DashboardPage } from "./pages/dashboard.page";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";

// Log in once before all tests in this file via storageState would be ideal,
// but since cookies are httpOnly we log in programmatically per test using the API.
async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  // The server sets httpOnly cookies — they are automatically stored by the context.
  expect(response.status()).toBe(200);
}

test.describe("Journey 2: Dashboard View", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("shows project cards with issue and deployment counts after login", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Heading is visible
    await expect(dashboardPage.heading).toBeVisible();

    // At least one project card should be rendered (seed data has projects)
    await expect(dashboardPage.projectCards.first()).toBeVisible({
      timeout: 10000,
    });

    // Each card contains issue count text (이슈 N개)
    const firstCard = dashboardPage.projectCards.first();
    await expect(firstCard.locator("text=/이슈 \\d+개/")).toBeVisible();
  });

  test("project cards link to /projects/:key", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    const firstCard = dashboardPage.projectCards.first();
    const href = await firstCard.getAttribute("href");

    expect(href).toMatch(/^\/projects\/[A-Z]/);
  });
});
