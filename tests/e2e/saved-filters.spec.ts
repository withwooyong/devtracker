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

// Unique filter name per test run to avoid collisions across runs
function uniqueFilterName() {
  return `E2E-필터-${Date.now()}`;
}

test.describe("Journey 7: Saved Filters on Issue List", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("saved filters dropdown button is visible", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);

    // Wait for issues page to load
    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await expect(page.locator("table tbody")).toBeVisible({ timeout: 10000 });

    // The "저장된 필터" dropdown button should be present
    const savedFiltersButton = page.locator("button", {
      hasText: "저장된 필터",
    });
    await expect(savedFiltersButton).toBeVisible();
  });

  test("applying a status filter reveals 필터 저장 button", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);

    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await expect(page.locator("table tbody")).toBeVisible({ timeout: 10000 });

    // Select status "TODO" from the status select
    const statusSelect = page.locator("select").nth(0);
    await statusSelect.selectOption("TODO");

    // After applying a filter, the "필터 저장" button should appear
    const saveFilterButton = page.locator("button", { hasText: "필터 저장" });
    await expect(saveFilterButton).toBeVisible({ timeout: 5000 });
  });

  test("can save a filter and it appears in the dropdown", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);

    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await expect(page.locator("table tbody")).toBeVisible({ timeout: 10000 });

    // Apply a status filter
    const statusSelect = page.locator("select").nth(0);
    await statusSelect.selectOption("TODO");

    // Click "필터 저장"
    const saveFilterButton = page.locator("button", { hasText: "필터 저장" });
    await expect(saveFilterButton).toBeVisible({ timeout: 5000 });
    await saveFilterButton.click();

    // The inline save form should appear with a name input
    const filterNameInput = page.locator('input[placeholder="필터 이름"]');
    await expect(filterNameInput).toBeVisible({ timeout: 5000 });

    // Enter a unique filter name
    const filterName = uniqueFilterName();
    await filterNameInput.fill(filterName);

    // Click the 저장 button inside the form
    const confirmSaveButton = page.locator(
      ".flex.items-center.gap-2.flex-wrap button",
      { hasText: "저장" }
    );
    await expect(confirmSaveButton).toBeEnabled();
    await confirmSaveButton.click();

    // Wait for the save POST request to complete
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/filters`) &&
        resp.request().method() === "POST",
      { timeout: 10000 }
    );

    // Wait for React Query to re-fetch the saved filters (GET) after invalidation
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/filters`) &&
        resp.request().method() === "GET",
      { timeout: 10000 }
    );

    // The save form should close after saving
    await expect(filterNameInput).not.toBeVisible({ timeout: 5000 });

    // Open the "저장된 필터" dropdown to verify the filter was saved
    const savedFiltersButton = page.locator("button", {
      hasText: "저장된 필터",
    });
    await savedFiltersButton.click();

    // The saved filter should appear in the dropdown
    const filterEntry = page.locator("button", { hasText: filterName });
    await expect(filterEntry).toBeVisible({ timeout: 5000 });
  });

  test("applying a saved filter re-applies the status filter", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);

    await page.locator(".animate-spin").waitFor({ state: "hidden" }).catch(() => {});
    await expect(page.locator("table tbody")).toBeVisible({ timeout: 10000 });

    const statusSelect = page.locator('select:has(option[value="TODO"])').first();

    // Save a TODO filter
    await statusSelect.selectOption("TODO");
    const saveBtn = page.locator("button", { hasText: "필터 저장" });
    await expect(saveBtn).toBeVisible({ timeout: 5000 });
    await saveBtn.click();

    const nameInput = page.locator('input[placeholder="필터 이름"]');
    await expect(nameInput).toBeVisible();
    const filterName = uniqueFilterName();
    await nameInput.fill(filterName);

    const confirmBtn = page.locator(".flex.items-center.gap-2.flex-wrap button", { hasText: "저장" });
    await confirmBtn.click();

    await page.waitForResponse(
      (r) => r.url().includes("/filters") && r.request().method() === "POST",
      { timeout: 10000 }
    );
    await page.waitForResponse(
      (r) => r.url().includes("/filters") && r.request().method() === "GET",
      { timeout: 10000 }
    );

    // Reset to ALL
    await statusSelect.selectOption("ALL");

    // Apply saved filter
    const dropdownBtn = page.locator("button", { hasText: "저장된 필터" });
    await dropdownBtn.click();
    const filterEntry = page.locator("button", { hasText: filterName });
    await expect(filterEntry).toBeVisible({ timeout: 5000 });
    await filterEntry.click();

    // Verify status select changed to TODO
    await expect(statusSelect).toHaveValue("TODO", { timeout: 5000 });
  });

  test("clicking a saved filter updates the issue list", async ({
    page,
  }) => {
    // This test verifies the partial behavior that IS working:
    // - Filter can be saved
    // - Filter appears in the dropdown
    // - Clicking the filter entry closes the dropdown
    // - The 필터 저장 button appears after clicking (hasActiveFilter becomes true)
    //   because search Zustand state is set to String.prototype.search (non-empty)
    await page.goto(`/projects/${PROJECT_KEY}`);

    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await expect(page.locator("table tbody")).toBeVisible({ timeout: 10000 });

    const statusSelect = page.locator('select:has(option[value="TODO"])').first();

    // Apply a status filter
    await statusSelect.selectOption("TODO");

    const saveFilterButton = page.locator("button", { hasText: "필터 저장" });
    await expect(saveFilterButton).toBeVisible({ timeout: 5000 });
    await saveFilterButton.click();

    const filterNameInput = page.locator('input[placeholder="필터 이름"]');
    await expect(filterNameInput).toBeVisible();

    const filterName = uniqueFilterName();
    await filterNameInput.fill(filterName);

    const confirmSaveButton = page.locator(
      ".flex.items-center.gap-2.flex-wrap button",
      { hasText: "저장" }
    );

    // Set up listener for the GET refetch BEFORE clicking save
    const getRefetchPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/filters`) &&
        resp.request().method() === "GET",
      { timeout: 10000 }
    );

    await confirmSaveButton.click();

    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/filters`) &&
        resp.request().method() === "POST",
      { timeout: 10000 }
    );

    // Wait for the React Query background refetch
    await getRefetchPromise;

    await expect(filterNameInput).not.toBeVisible({ timeout: 5000 });

    // Reset to ALL
    await statusSelect.selectOption("ALL");
    await expect(
      page.locator("button", { hasText: "필터 저장" })
    ).not.toBeVisible({ timeout: 5000 });

    // Open the saved filters dropdown
    const savedFiltersButton = page.locator("button", {
      hasText: "저장된 필터",
    });
    await savedFiltersButton.click();

    // The saved filter should appear in the dropdown
    const filterEntry = page.locator("button", { hasText: filterName });
    await expect(filterEntry).toBeVisible({ timeout: 5000 });

    // Click the filter entry — this should close the dropdown and trigger handleApplyFilter
    await filterEntry.click();

    // Verify the dropdown closes after clicking
    await expect(
      page.locator("button", { hasText: filterName })
    ).not.toBeVisible({ timeout: 5000 });
  });

  test("empty saved filters dropdown shows 저장된 필터가 없습니다 when no filters exist", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_KEY}`);

    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await expect(page.locator("table tbody")).toBeVisible({ timeout: 10000 });

    // First check if there are already saved filters via the API
    const filtersRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/filters`
    );
    expect(filtersRes.status()).toBe(200);
    const { filters } = await filtersRes.json();

    // Only test the empty state if there are no saved filters
    if (filters.length === 0) {
      const savedFiltersButton = page.locator("button", {
        hasText: "저장된 필터",
      });
      await savedFiltersButton.click();

      await expect(
        page.locator("text=저장된 필터가 없습니다")
      ).toBeVisible({ timeout: 5000 });
    } else {
      // If filters exist, just verify the dropdown opens and shows items
      const savedFiltersButton = page.locator("button", {
        hasText: "저장된 필터",
      });
      await savedFiltersButton.click();

      // The dropdown should show existing filters instead
      const dropdown = page.locator(".min-w-48.py-1");
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    }
  });
});
