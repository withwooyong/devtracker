import { test, expect } from "@playwright/test";
import { DashboardPage } from "./pages/dashboard.page";
import { ProjectIssuesPage } from "./pages/project-issues.page";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";

async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

test.describe("Journey 4: Project Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("dashboard → click project → sees issue list with table", async ({
    page,
  }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.waitForLoad();

    // Capture the href before clicking to know where we expect to land
    const firstCard = dashboardPage.projectCards.first();
    const expectedHref = await firstCard.getAttribute("href");
    expect(expectedHref).toBeTruthy();

    // Click the project card
    await dashboardPage.clickFirstProject();

    // Verify URL changed to the project page
    await page.waitForURL(`**${expectedHref}`, { timeout: 10000 });
    await expect(page).toHaveURL(new RegExp(expectedHref!.replace("/", "\\/")));

    // Issue list page shows the issues table
    const issuesPage = new ProjectIssuesPage(page);
    await issuesPage.waitForLoad();

    await expect(issuesPage.issueTableBody).toBeVisible();

    // Navigation tabs (이슈 목록 / 칸반 보드) should be visible
    await expect(issuesPage.issueListLink).toBeVisible();
    await expect(issuesPage.kanbanBoardLink).toBeVisible();
  });

  test("issue list shows correct project name in heading", async ({ page }) => {
    // Get list of projects first
    const apiRes = await page.request.get("/api/projects");
    expect(apiRes.status()).toBe(200);
    const { projects } = await apiRes.json();
    expect(projects.length).toBeGreaterThan(0);

    const firstProject = projects[0];
    await page.goto(`/projects/${firstProject.key}`);

    // Wait for data to load
    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});

    // Page heading should contain the project name (scope to main content, not sidebar)
    const heading = page.locator("main h1");
    await expect(heading).toContainText(firstProject.name, { timeout: 10000 });
  });
});
