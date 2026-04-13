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

test.describe("Journey 5: Rich Text Editor on Issue Creation", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("rich editor toolbar is present on new issue page", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/new`);

    // Wait for the page to load (spinner disappears or heading visible)
    await expect(page.locator("h1", { hasText: "이슈 생성" })).toBeVisible({
      timeout: 10000,
    });

    // Wait for the tiptap editor to mount (it renders asynchronously)
    // The toolbar contains Bold (B), Italic (I), Strike (S) buttons
    const toolbar = page.locator(".bg-gray-50.rounded-t-lg");
    await expect(toolbar).toBeVisible({ timeout: 10000 });

    // Verify Bold button is present in toolbar
    const boldButton = toolbar.locator("button", { hasText: "B" });
    await expect(boldButton).toBeVisible();

    // Verify Italic button is present
    const italicButton = toolbar.locator("button", { hasText: "I" });
    await expect(italicButton).toBeVisible();

    // Verify the ProseMirror editor div is present
    const proseMirror = page.locator(".ProseMirror");
    await expect(proseMirror).toBeVisible();
  });

  test("can type text in the rich editor", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/new`);

    await expect(page.locator("h1", { hasText: "이슈 생성" })).toBeVisible({
      timeout: 10000,
    });

    // Wait for tiptap editor to mount
    const proseMirror = page.locator(".ProseMirror");
    await expect(proseMirror).toBeVisible({ timeout: 10000 });

    // Click into the editor and type
    await proseMirror.click();
    await proseMirror.type("E2E 테스트 설명 내용입니다.");

    // Verify the typed text is visible in the editor
    await expect(proseMirror).toContainText("E2E 테스트 설명 내용입니다.");
  });

  test("bold formatting button toggles active state", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/new`);

    await expect(page.locator("h1", { hasText: "이슈 생성" })).toBeVisible({
      timeout: 10000,
    });

    const proseMirror = page.locator(".ProseMirror");
    await expect(proseMirror).toBeVisible({ timeout: 10000 });

    // Click into editor and type some text
    await proseMirror.click();
    await proseMirror.type("볼드 텍스트");

    // Select all text in the editor (Ctrl+A)
    await proseMirror.press("Control+a");

    // Click the Bold button
    const toolbar = page.locator(".bg-gray-50.rounded-t-lg");
    const boldButton = toolbar.locator("button", { hasText: "B" });
    await boldButton.click();

    // After clicking Bold, the button should have the active class (bg-gray-200)
    await expect(boldButton).toHaveClass(/bg-gray-200/);
  });

  test("can create issue with rich text description and it redirects to issue list", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_KEY}/issues/new`);

    await expect(page.locator("h1", { hasText: "이슈 생성" })).toBeVisible({
      timeout: 10000,
    });

    // Fill in the title
    const titleInput = page.locator('input[required]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill("E2E 리치 에디터 테스트 이슈");

    // Type in the rich editor
    const proseMirror = page.locator(".ProseMirror");
    await expect(proseMirror).toBeVisible({ timeout: 10000 });
    await proseMirror.click();
    await proseMirror.type("이 이슈는 E2E 테스트로 생성되었습니다.");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]', {
      hasText: "이슈 생성",
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Should redirect to the project issues page after successful creation
    await page.waitForURL(`**/projects/${PROJECT_KEY}`, { timeout: 15000 });
    await expect(page).toHaveURL(new RegExp(`/projects/${PROJECT_KEY}$`));

    // The new issue should appear in the list (use .first() in case multiple test runs created the same title)
    await expect(
      page.locator("table tbody td", { hasText: "E2E 리치 에디터 테스트 이슈" }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
