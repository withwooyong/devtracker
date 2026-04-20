import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

const ADMIN_EMAIL = "withwooyong@yanadoocorp.com";
const ADMIN_PASSWORD = "yanadoo123";
const PROJECT_KEY = "DEV";

async function loginViaApi(page: import("@playwright/test").Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.status()).toBe(200);
}

// 1x1 PNG (valid magic bytes)
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

async function ensureIssue(page: import("@playwright/test").Page) {
  const res = await page.request.post(
    `/api/projects/${PROJECT_KEY}/issues`,
    {
      data: {
        title: `E2E-attachment-${Date.now()}`,
        priority: "LOW",
        status: "TODO",
      },
    }
  );
  expect(res.status()).toBe(201);
  const { issue } = await res.json();
  return issue as { id: string; issueNumber: number };
}

test.describe("Journey 9: Issue Attachments", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("upload API accepts a small PNG and persists metadata", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);

    const tmp = path.join(os.tmpdir(), `e2e-${Date.now()}.png`);
    fs.writeFileSync(tmp, TINY_PNG);

    const res = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`,
      {
        multipart: {
          file: {
            name: "e2e.png",
            mimeType: "image/png",
            buffer: TINY_PNG,
          },
        },
      }
    );
    expect(res.status()).toBe(201);
    const { attachment } = await res.json();
    expect(attachment.filename).toContain("e2e");
    expect(attachment.mimeType).toBe("image/png");
    expect(attachment.url).toMatch(/^https:\/\//);

    fs.unlinkSync(tmp);

    // 프록시 다운로드로 실제 바이트 검증
    const downloadRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments/${attachment.id}/download`
    );
    expect(downloadRes.status()).toBe(200);
    expect(downloadRes.headers()["content-type"]).toBe("image/png");
    const downloadedBytes = await downloadRes.body();
    expect(downloadedBytes.equals(TINY_PNG)).toBe(true);

    // Cleanup: delete the uploaded attachment + issue
    await page.request.delete(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments/${attachment.id}`
    );
  });

  test("download proxy requires authentication", async ({ page, playwright }) => {
    const issue = await ensureIssue(page);
    const uploadRes = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`,
      {
        multipart: {
          file: { name: "auth.png", mimeType: "image/png", buffer: TINY_PNG },
        },
      }
    );
    const { attachment } = await uploadRes.json();

    // fresh context without auth cookies
    const anon = await playwright.request.newContext({
      baseURL: "http://localhost:3000",
    });
    const res = await anon.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments/${attachment.id}/download`
    );
    expect(res.status()).toBe(401);
    await anon.dispose();

    // cleanup
    await page.request.delete(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments/${attachment.id}`
    );
  });

  test("rejects files larger than 4MB", async ({ page }) => {
    const issue = await ensureIssue(page);
    const big = Buffer.alloc(5 * 1024 * 1024, 0); // 5MB

    const res = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`,
      {
        multipart: {
          file: { name: "big.bin", mimeType: "application/zip", buffer: big },
        },
      }
    );
    expect(res.status()).toBe(413);
  });

  test("rejects disallowed MIME types", async ({ page }) => {
    const issue = await ensureIssue(page);

    const res = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`,
      {
        multipart: {
          file: {
            name: "exec.bin",
            mimeType: "application/x-executable",
            buffer: Buffer.from("MZ"),
          },
        },
      }
    );
    expect(res.status()).toBe(400);
  });

  test("attachment list renders on issue detail page", async ({ page }) => {
    const issue = await ensureIssue(page);
    // Upload one via API
    const uploadRes = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`,
      {
        multipart: {
          file: {
            name: "list-test.png",
            mimeType: "image/png",
            buffer: TINY_PNG,
          },
        },
      }
    );
    expect(uploadRes.status()).toBe(201);
    const { attachment } = await uploadRes.json();

    await page.goto(
      `/projects/${PROJECT_KEY}/issues/${issue.issueNumber}`
    );
    await expect(page.getByText("첨부파일").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("list-test.png")).toBeVisible();

    // Cleanup
    await page.request.delete(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments/${attachment.id}`
    );
  });

  test("DELETE removes attachment and it disappears from list", async ({
    page,
  }) => {
    const issue = await ensureIssue(page);
    const uploadRes = await page.request.post(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`,
      {
        multipart: {
          file: {
            name: "delete-me.png",
            mimeType: "image/png",
            buffer: TINY_PNG,
          },
        },
      }
    );
    const { attachment } = await uploadRes.json();

    const delRes = await page.request.delete(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments/${attachment.id}`
    );
    expect(delRes.status()).toBe(200);

    const listRes = await page.request.get(
      `/api/projects/${PROJECT_KEY}/issues/${issue.id}/attachments`
    );
    const { attachments } = await listRes.json();
    expect(attachments.find((a: { id: string }) => a.id === attachment.id)).toBeUndefined();
  });
});
