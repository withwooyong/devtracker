# E2E 테스트 가이드 (Playwright)

DevTracker 프로젝트의 E2E(End-to-End) 테스트 실행 및 작성 가이드.

## 사전 준비

```bash
# Playwright 설치 (최초 1회)
pnpm add -D @playwright/test
npx playwright install chromium
```

## 테스트 실행

```bash
# 1. dev 서버 먼저 실행 (별도 터미널)
pnpm dev

# 2. 전체 테스트 실행
npx playwright test

# 3. 특정 파일만 실행
npx playwright test tests/e2e/auth.spec.ts

# 4. 브라우저 화면 보면서 실행
npx playwright test --headed

# 5. 디버그 모드 (step-by-step)
npx playwright test --debug

# 6. 테스트 리포트 확인
npx playwright show-report
```

## 프로젝트 구조

```
tests/e2e/
├── pages/                         # Page Object Model
│   ├── login.page.ts              # 로그인 페이지
│   ├── dashboard.page.ts          # 대시보드 페이지
│   └── project-issues.page.ts     # 이슈 목록 페이지
├── auth.spec.ts                   # 인증 플로우 테스트
├── dashboard.spec.ts              # 대시보드 테스트
└── project-navigation.spec.ts     # 프로젝트 네비게이션 테스트
playwright.config.ts               # Playwright 설정
```

## 현재 테스트 목록 (7개)

### auth.spec.ts — 인증 플로우

| 테스트 | 설명 |
|--------|------|
| 로그인 성공 → 대시보드 리다이렉트 | /login에서 이메일/비밀번호 입력 → /dashboard로 이동 |
| 잘못된 비밀번호 → 에러 메시지 | 틀린 비밀번호 입력 시 에러 표시, /login 유지 |
| 비인증 → 대시보드 접근 차단 | 로그인 없이 /dashboard 접근 시 /login 리다이렉트 |

### dashboard.spec.ts — 대시보드

| 테스트 | 설명 |
|--------|------|
| 프로젝트 카드 표시 | 로그인 후 프로젝트 카드에 이슈/배포 count 표시 |
| 프로젝트 카드 링크 | 카드의 href가 `/projects/[KEY]` 형태인지 확인 |

### project-navigation.spec.ts — 프로젝트 네비게이션

| 테스트 | 설명 |
|--------|------|
| 대시보드 → 프로젝트 → 이슈 목록 | 카드 클릭 → 이슈 테이블 + 네비게이션 탭 표시 |
| 프로젝트 이름 표시 | 이슈 목록 h1에 프로젝트 이름 표시 |

## 테스트 작성 가이드

### Page Object Model 패턴

새 페이지의 테스트를 작성할 때는 먼저 `tests/e2e/pages/`에 Page Object를 만든다.

```typescript
// tests/e2e/pages/board.page.ts
import { type Page, type Locator } from "@playwright/test";

export class BoardPage {
  readonly page: Page;
  readonly columns: Locator;
  readonly cards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.columns = page.locator("[class*='min-w-']");
    this.cards = page.locator("[class*='cursor-grab']");
  }

  async goto(projectKey: string) {
    await this.page.goto(`/projects/${projectKey}/board`);
  }

  async waitForLoad() {
    await this.page.locator(".animate-spin").waitFor({ state: "hidden" }).catch(() => {});
  }
}
```

### 인증이 필요한 테스트

httpOnly 쿠키이므로 API를 직접 호출하여 로그인한다.

```typescript
async function loginViaApi(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: { email: "withwooyong@yanadoocorp.com", password: "yanadoo123" },
  });
  expect(response.status()).toBe(200);
  // httpOnly 쿠키가 자동으로 브라우저 컨텍스트에 저장됨
}

test.beforeEach(async ({ page }) => {
  await loginViaApi(page);
});
```

### 새 테스트 파일 작성 예시

```typescript
// tests/e2e/board.spec.ts
import { test, expect } from "@playwright/test";
import { BoardPage } from "./pages/board.page";

async function loginViaApi(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/login", {
    data: { email: "withwooyong@yanadoocorp.com", password: "yanadoo123" },
  });
  expect(res.status()).toBe(200);
}

test.describe("칸반 보드", () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test("보드에 4개 컬럼이 표시된다", async ({ page }) => {
    const boardPage = new BoardPage(page);
    await boardPage.goto("DEV");
    await boardPage.waitForLoad();

    await expect(boardPage.columns).toHaveCount(4);
  });
});
```

## 설정 (playwright.config.ts)

```typescript
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,         // 순차 실행 (DB 상태 공유)
  workers: 1,                   // 단일 워커
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",    // 실패 시 trace 저장
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

### 주요 설정 옵션

| 옵션 | 값 | 설명 |
|------|-----|------|
| `workers` | 1 | SQLite는 동시 쓰기 불가 → 단일 워커 |
| `fullyParallel` | false | 테스트 순서 보장 |
| `trace` | on-first-retry | 첫 번째 재시도 시 trace 파일 생성 |
| `screenshot` | only-on-failure | 실패 시에만 스크린샷 |
| `retries` | CI에서 2 | CI 환경에서 flaky 테스트 대응 |

## 테스트 결과 확인

### CLI 출력

```
Running 7 tests using 1 worker

  ✓  auth.spec.ts › Login Flow › navigates to /login, submits credentials (2.1s)
  ✓  auth.spec.ts › Login Flow › shows error message on invalid credentials (1.2s)
  ✓  auth.spec.ts › Auth Protection › unauthenticated access redirects (2.5s)
  ✓  dashboard.spec.ts › Dashboard View › shows project cards (1.8s)
  ✓  dashboard.spec.ts › Dashboard View › project cards link to /projects/:key (1.4s)
  ✓  project-navigation.spec.ts › click project → sees issue list (2.3s)
  ✓  project-navigation.spec.ts › correct project name in heading (1.7s)

  7 passed (13.0s)
```

### HTML 리포트

```bash
npx playwright show-report
```

### 실패 시 artifact 확인

실패한 테스트의 스크린샷, 비디오, trace 파일은 아래에 저장된다:

```
test-results/           # 스크린샷, 비디오
playwright-report/      # HTML 리포트
```

trace 파일 열기:
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

## 주의사항

- dev 서버(`pnpm dev`)가 실행 중이어야 테스트 가능
- 시드 데이터가 있어야 함 (`npx tsx prisma/seed.ts`)
- SQLite 사용으로 `workers: 1` 필수
- httpOnly 쿠키이므로 `page.request.post()`로 로그인
- `main h1`으로 스코핑해야 사이드바 h1과 충돌 방지
