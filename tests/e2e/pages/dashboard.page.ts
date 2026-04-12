import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly projectCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h1", { hasText: "대시보드" });
    this.projectCards = page.locator('a[href^="/projects/"]');
  }

  async goto() {
    await this.page.goto("/dashboard");
  }

  async waitForLoad() {
    // Wait for heading and for the spinner to disappear
    await this.heading.waitFor({ state: "visible" });
    await this.page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {
        // spinner may never appear if data loads fast
      });
  }

  async clickFirstProject() {
    await this.projectCards.first().click();
  }
}
