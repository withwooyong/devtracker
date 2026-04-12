import { type Page, type Locator } from "@playwright/test";

export class ProjectIssuesPage {
  readonly page: Page;
  readonly issueTableBody: Locator;
  readonly issueListLink: Locator;
  readonly kanbanBoardLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.issueTableBody = page.locator("table tbody");
    this.issueListLink = page.locator("a", { hasText: "이슈 목록" });
    this.kanbanBoardLink = page.locator("a", { hasText: "칸반 보드" });
  }

  async waitForLoad() {
    await this.page
      .locator(".animate-spin")
      .waitFor({ state: "hidden" })
      .catch(() => {});
    await this.issueTableBody.waitFor({ state: "visible" });
  }
}
