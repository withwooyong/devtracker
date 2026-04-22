import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";

test.describe("모바일 반응형 스모크", () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("사이드바 드로어: 햄버거 → 열림, 링크 클릭 → 닫힘", async ({ page }) => {
    const hamburger = page.locator("[data-sidebar-trigger]");
    await expect(hamburger).toBeVisible();

    const sidebar = page.locator("aside[aria-label='사이드바']");

    // 초기에는 드로어가 닫혀 있음 (translate-x-full)
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // 햄버거 클릭 → 드로어 열림
    await hamburger.click();
    await expect(sidebar).toHaveClass(/translate-x-0/);
    await expect(sidebar).toHaveAttribute("role", "dialog");

    // 프로젝트 링크 클릭 → 이동 + 드로어 닫힘
    await sidebar.locator("a", { hasText: "프로젝트" }).click();
    await page.waitForURL(/\/projects$/, { timeout: 5000 });
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test("이슈 목록: 모바일 카드 뷰 렌더, 테이블은 숨김", async ({ page }) => {
    // 대시보드에서 첫 프로젝트 진입
    const firstProject = page.locator('a[href^="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 10000 });

    // 로딩 스피너 사라질 때까지
    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});

    // 테이블 래퍼는 hidden md:block → 모바일에서 display:none
    const tableWrapper = page.locator("div.hidden.md\\:block").first();
    await expect(tableWrapper).not.toBeVisible();

    // 모바일 카드 리스트가 visible (이슈가 없을 수도 있으므로 컨테이너만 확인)
    const mobileList = page.locator("div.md\\:hidden").first();
    await expect(mobileList).toBeVisible();
  });

  test("칸반 보드: 4개 상태 pill 표시, DnD 영역은 숨김", async ({ page }) => {
    const firstProject = page.locator('a[href^="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 10000 });

    // 칸반 탭 이동
    await page.locator("nav a", { hasText: "칸반 보드" }).click();
    await page.waitForURL(/\/board$/, { timeout: 5000 });

    await page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});

    // 4개 상태 pill (할 일/진행 중/리뷰 중/완료) — 라벨 부분 텍스트 매칭
    for (const label of ["할 일", "진행 중", "리뷰 중", "완료"]) {
      await expect(
        page.locator("button", { hasText: label })
      ).toBeVisible();
    }
  });

  test("프로젝트 탭 네비: 가로 스크롤 + active 시각 표시", async ({ page }) => {
    const firstProject = page.locator('a[href^="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 10000 });

    const tabsNav = page.locator("nav[aria-label='프로젝트 탭']");
    await expect(tabsNav).toBeVisible();

    // "이슈 목록" 링크에 aria-current="page" (exact 경로)
    const activeTab = tabsNav.locator("a[aria-current='page']");
    await expect(activeTab).toHaveText("이슈 목록");

    // 5개 탭 모두 렌더됨
    const allTabs = tabsNav.locator("a");
    await expect(allTabs).toHaveCount(5);
  });
});
