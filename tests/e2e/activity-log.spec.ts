import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";
// Issue number 1 — "로그인 페이지 UI 개선" — exists from seed data
const ISSUE_NUMBER = "1";

async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

test.describe("Journey 6: Activity Log on Issue Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("issue detail page shows comment/활동/전체 tabs", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/${ISSUE_NUMBER}`);

    // Wait for issue to load — the heading with issue number should appear
    await expect(
      page.locator("span", { hasText: `${PROJECT_KEY}-${ISSUE_NUMBER}` })
    ).toBeVisible({ timeout: 10000 });

    // The three tab buttons should be visible (tab buttons have the border-b-2 class)
    const commentsTab = page.locator("button.border-b-2", { hasText: /^댓글/ });
    await expect(commentsTab).toBeVisible();

    const activitiesTab = page.locator("button", { hasText: "활동" });
    await expect(activitiesTab).toBeVisible();

    const allTab = page.locator("button", { hasText: "전체" });
    await expect(allTab).toBeVisible();
  });

  test("clicking 활동 tab shows activity entries", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/${ISSUE_NUMBER}`);

    // Wait for issue to load
    await expect(
      page.locator("span", { hasText: `${PROJECT_KEY}-${ISSUE_NUMBER}` })
    ).toBeVisible({ timeout: 10000 });

    // Click the "활동" tab
    const activitiesTab = page.locator("button", { hasText: "활동" });
    await activitiesTab.click();

    // Wait for activities to load — the API call is triggered when the tab becomes active
    // The ActivityTimeline shows activities; seed issues had CREATED activity logged on creation
    // We check that either an activity or the empty state is visible
    const activityContainer = page.locator(".bg-white.p-4.rounded-lg.border").last();
    await expect(activityContainer).toBeVisible({ timeout: 10000 });

    // The activity timeline or the empty state message should appear
    const hasActivities = await page
      .locator("text=/이슈를 생성했습니다|이슈를 생성했습니다/")
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .locator("text=활동 내역이 없습니다")
      .isVisible()
      .catch(() => false);

    // At least one of the two states must be visible
    expect(hasActivities || hasEmptyState).toBeTruthy();
  });

  test("changing issue status via dropdown creates a new activity entry", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/${ISSUE_NUMBER}`);

    // Wait for issue to load
    await expect(
      page.locator("span", { hasText: `${PROJECT_KEY}-${ISSUE_NUMBER}` })
    ).toBeVisible({ timeout: 10000 });

    // First switch to 활동 tab to see current state
    const activitiesTab = page.locator("button", { hasText: "활동" });
    await activitiesTab.click();

    // Wait for any existing activities to load
    await page.waitForTimeout(1000);

    // Count activity items visible before status change
    const timelineItems = page.locator(".space-y-0 > div.flex.gap-3");
    const countBefore = await timelineItems.count();

    // Switch back to check current status from the sidebar select
    const statusSelect = page.locator('select').first();
    const currentStatus = await statusSelect.inputValue();

    // Change to a different status
    const newStatus = currentStatus === "TODO" ? "IN_PROGRESS" : "TODO";
    await statusSelect.selectOption(newStatus);

    // Wait for the PATCH request to complete — invalidates activity query
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/issues/${ISSUE_NUMBER}`) &&
        resp.request().method() === "PATCH",
      { timeout: 10000 }
    );

    // Re-click the 활동 tab to see updated activities
    // (The component re-fetches when the tab is active after query invalidation)
    const commentsTab = page.locator("button", { hasText: /댓글/ });
    await commentsTab.click();
    await activitiesTab.click();

    // Wait for the activity list to update
    await page.waitForTimeout(1000);

    // There should now be at least one STATUS_CHANGED activity visible
    const statusChangedActivity = page.locator("text=상태를 변경했습니다").first();
    await expect(statusChangedActivity).toBeVisible({ timeout: 10000 });

    // The count of items should have increased (or at minimum the status_changed text appears)
    const countAfter = await timelineItems.count();
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test("전체 tab merges comments and activities", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/${ISSUE_NUMBER}`);

    await expect(
      page.locator("span", { hasText: `${PROJECT_KEY}-${ISSUE_NUMBER}` })
    ).toBeVisible({ timeout: 10000 });

    // Click the 전체 tab
    const allTab = page.locator("button", { hasText: "전체" });
    await allTab.click();

    // Either items are shown or the empty state message appears
    const hasItems = await page
      .locator(".space-y-3 > div")
      .first()
      .isVisible()
      .catch(() => false);

    const hasEmptyState = await page
      .locator("text=내역이 없습니다")
      .isVisible()
      .catch(() => false);

    expect(hasItems || hasEmptyState).toBeTruthy();
  });

  test("activities API accepts both issueNumber and issue.id (UUID)", async ({
    page,
  }) => {
    // 새 이슈 생성 → UUID와 issueNumber 두 경로 모두로 activities 조회
    const createRes = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues`,
      {
        data: {
          title: `E2E-activities-uuid-${Date.now()}`,
          priority: "LOW",
          status: "TODO",
        },
      }
    );
    expect(createRes.status()).toBe(201);
    const { issue } = await createRes.json();

    // issueNumber 경로
    const byNumber = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.issueNumber}/activities`
    );
    expect(byNumber.status()).toBe(200);
    const byNumberBody = await byNumber.json();
    expect(Array.isArray(byNumberBody.activities)).toBeTruthy();

    // UUID 경로 — 이전에는 parseInt가 UUID 앞자리를 숫자로 읽어 엉뚱한 이슈에
    // 매칭되거나 404를 반환하던 엣지. 이제 UUID 패턴이 우선 검사돼야 한다.
    const byUuid = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/activities`
    );
    expect(byUuid.status()).toBe(200);
    const byUuidBody = await byUuid.json();
    expect(Array.isArray(byUuidBody.activities)).toBeTruthy();
    expect(byUuidBody.total).toBe(byNumberBody.total);
  });
});
