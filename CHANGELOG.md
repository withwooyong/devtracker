# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

## [2026-04-21] GitHubLink 타입 배지 UI

### Added
- `src/types/github-link.ts`: `GITHUB_LINK_TYPE_LABELS`(PR/커밋/브랜치), `GITHUB_LINK_TYPE_COLORS`(blue/slate/amber 저채도 pill) 맵, `formatGitHubLinkExternalHint(type, externalId)` 헬퍼 추가
- 이슈 상세 `GitHubLinkList`에 타입 컬러 pill + 외부 ID 힌트(PR `#번호`, COMMIT SHA 7자) 렌더링
- 루트 section·타입 pill·힌트 span에 `data-testid` 부여 — E2E 견고성 확보
- E2E Journey 15 × 2건: PR 배지+`#번호` 힌트, COMMIT 배지("커밋")+SHA 7자 힌트 렌더링 검증 — 총 68개
- ADR-024 신규 (타입 배지 UI 결정 기록)
- `docs/user-guide.md` 10-2에 타입 배지 색상·힌트 가이드 추가
- `.gitignore`에 `.claude/settings.local.json` 추가 — Claude Code 개인 설정 격리

### Changed
- `docs/e2e-testing-guide.md` 66개/14 Journey → 68개/15 Journey

### Fixed
- E2E locator 견고성: `page.locator("h3").locator("..")` XPath 부모 참조 → `page.getByTestId("github-link-section")` 직행
- PR 번호 충돌 가능성: `Date.now() % 1_000_000`(16.7분 주기 중복) → `Math.floor(Math.random() * 1e9)` (unique 제약 저촉 회피)

---

## [2026-04-21] GitHub push 이벤트 지원

### Added
- `src/app/api/webhooks/github/route.ts`: push 이벤트 핸들러(`handlePush()`) 신설. 커밋 메시지에서 이슈 키 추출 → 프로젝트/이슈 매핑 → `GitHubLink(type="COMMIT", status=null, externalId=commit.id)` upsert
- 응답 필드에 `commits: number`(페이로드 내 총 커밋 수) 추가. `matched`는 연결된 링크 수
- scoped 모드에서 매핑된 프로젝트 키의 커밋만 링크되고, 외부 키는 `skippedKeys`(중복 제거된 Set)로 응답 + `console.info` 로그
- E2E Journey 14 × 5건: 기본 링크 생성, 동일 push 재전송 dedup, 다중 commit 부분 매핑, deleted push skipped, 빈 commits matched=0
- E2E Journey 14b × 1건: scoped 모드 cross-project 커밋은 `skippedKeys`에 축적 — 총 66개
- ADR-023 신규 (push 이벤트 지원 결정 기록)
- `docs/user-guide.md` 10-2 표에 Push(commit) 행 추가, 10-3 주의사항에 push 동작 설명 추가

### Changed
- 기존 단일 POST 핸들러에서 PR 로직을 `handlePullRequest()`로 추출하고, 공통 프로젝트 조회를 `resolveProjectForKey()` 헬퍼로 분리 — behavior-preserving refactor
- push 루프의 프로젝트 조회를 `findMany({ key: { in: uniqueKeys } })`로 배치화해 legacy 모드 N+1 제거
- `deleted: true` 조기 반환 응답에도 `matched: 0, commits: 0` 포함해 응답 shape 통일
- `PullRequestPayload`/`PushPayload`/`ScopedProjectLite` 타입 추가로 핸들러 간 계약 명시
- `docs/e2e-testing-guide.md` 60개/13 Journey → 66개/14 Journey(14/14b 하위 묶음)

### Security
- push 이벤트도 기존 서명 검증(전역/프로젝트별 secret 선택) + scoped 라우팅을 그대로 적용 — 보안 경계 변경 없음

---

## [2026-04-21] GitHub 사용자 매핑

### Added
- `User.githubLogin String? @unique`, `User.githubId Int? @unique` 필드 추가 (로컬 SQLite + Turso ALTER + unique index)
- `PATCH /api/auth/me` 신설: 본인 `githubLogin`(GitHub 로그인 정규식 검증, 1~39자) / `name` 셀프 업데이트. 중복 선검사로 409 응답
- `src/app/api/webhooks/github/route.ts`: `resolvePullRequestAuthor()` — `githubId → githubLogin` 순 매칭. login 매칭 시 `githubId`를 항상 최신화하여 로그인 변경 내성 확보. 매칭 성공 시 `Activity.userId`가 매핑된 user, 실패 시 `issue.reporterId` 폴백
- webhook 응답에 `prAuthorMatched: boolean` 필드 추가 (운영·테스트 관측성)
- `/settings` 사용자 프로필 페이지 신설: 이메일·이름 read-only + GitHub 로그인 편집 + 저장 후 `auth/me` 쿼리 무효화
- 사이드바 사용자 블록에 "내 프로필" 링크 추가(현재 경로 강조 스타일)
- `src/types/user.ts`에 `githubLogin?: string | null` 필드 추가
- E2E Journey 13 × 6건: PATCH 라운드트립, 중복 409, 형식 400, 매칭된 PR → Activity가 매핑된 user 명의, 알 수 없는 PR → reporter 폴백, login 매칭 시 `githubId` 자동 저장 후 id 단독으로도 매칭 — 총 60개
- ADR-022 신규 (GitHub 사용자 매핑 결정 기록)

### Changed
- `GET /api/auth/me` 응답에 `githubLogin` 포함 (사용자 프로필 페이지 초기값 렌더링용)
- `PullRequestPayload.pull_request.user?: { login: string; id: number }` 타입 추가
- `docs/user-guide.md` 10-4 섹션 신설(GitHub 계정 연결·자동 매핑 설명), 사이드바 네비게이션 목록에 "내 프로필" 추가
- `docs/e2e-testing-guide.md` 54개/12 Journey → 60개/13 Journey (Journey 13 추가)

### Security
- 자기 프로필 외 수정 경로 없음 — `PATCH /api/auth/me`는 토큰의 `userId`로만 update. 타인 `githubLogin` 변경 불가
- 중복 `githubLogin` pre-insert 검사로 409 응답 — libSQL 어댑터의 P2002 에러 shape 의존 회피

---

## [2026-04-21] GitHub webhook 프로젝트별 secret

### Added
- `Project.githubWebhookSecret String?` 필드 추가. 설정 시 해당 프로젝트의 webhook은 전역 `GITHUB_WEBHOOK_SECRET` 대신 이 값으로 서명을 재검증 (로컬 SQLite + Turso 반영)
- `src/app/api/webhooks/github/route.ts`: 라우팅 순서 재설계 — rawBody best-effort 파싱 → `repository.full_name`으로 scoped 프로젝트 조회 → secret 선택(프로젝트 secret 있으면 우선, 없으면 전역) → HMAC 검증 → 이후 ping/pull_request 분기
- webhook 응답에 `secretSource: "project" | "global"` 필드 추가 (운영·테스트 관측성)
- 설정 페이지에 **Webhook Secret** 섹션 신설: password 입력 + 설정됨/미설정 뱃지 + 제거/제거 취소 액션. 저장 성공 후 입력값 초기화
- `src/types/project.ts`에 `githubWebhookSecretSet?: boolean` 필드 추가
- E2E Journey 10c × 3건: GET 응답에 secret 원문 비노출, 프로젝트 secret 서명 통과(`secretSource=project`), 프로젝트 secret 설정 상태에서 전역 secret 서명은 401 — 총 54개
- ADR-021 신규 (프로젝트별 webhook secret 결정 기록)

### Changed
- `GET/PATCH /api/projects/[projectId]`: 응답을 `select`로 필드 고정하고 `githubWebhookSecret` 원문은 제거, `githubWebhookSecretSet: boolean` 플래그로 대체 (서버 → 클라이언트로 평문 유출 금지)
- `updateSchema` 확장: `githubWebhookSecret`(16~256자 또는 빈 문자열→`null`). 빈 문자열은 서버에서 `null`로 정규화하여 전역 secret 재사용
- `docs/user-guide.md`의 "프로젝트 설정 편집" 섹션에 Webhook Secret 항목 추가
- `docs/e2e-testing-guide.md` 51개/12 Journey → 54개/12 Journey(10c 하위 묶음) 반영

### Security
- webhook secret은 프로젝트별 저장 후 API로 다시 흐르지 않도록 설계 (자격증명 평문 유출 방지)
- 서명 검증 전 수행하는 부작용은 `JSON.parse`와 `repo` 완전일치 `findFirst` 한 번뿐이며, 실패 시 즉시 401 — 쿼리 증폭/DoS 벡터 없음

---

## [2026-04-21] GitHub webhook 하이브리드 라우팅

### Added
- `src/app/api/webhooks/github/route.ts`: `Project.githubRepo`와 `payload.repository.full_name`이 매칭되면 "scoped" 모드로 해당 프로젝트 이슈만 처리. 매칭 없으면 기존 "legacy" 키-prefix 경로로 폴백 (`03c0ec7`)
- scoped 모드의 cross-project silent drop을 `skippedKeys` 응답 필드 + `console.info` 로그로 관측성 보강
- 응답에 `mode: "scoped" | "legacy"` 필드 추가
- E2E Journey 10b × 3건: scoped 매칭, scoped 다른 키 무시, scoped cross-project 부분 처리 (`03c0ec7`) — 총 51개
- ADR-020 신규 (하이브리드 라우팅 결정 기록)

### Changed
- `PullRequestPayload.repository`를 optional로 변경(`?: { full_name: string }`) — GitHub이 필드를 누락해도 null-safe하게 legacy로 폴백
- E2E `beforeAll/afterAll`을 `playwright.request.newContext()`로 독립 세션화, `afterAll` 복원 응답 status 검증 추가 (쿠키 격리 불확실성 제거, 테스트 상태 오염 방지)
- `docs/e2e-testing-guide.md` 48개/12 Journey → 51개/12 Journey(10b 하위 묶음) 반영

---

## [2026-04-21] 프로젝트 설정 페이지 1차

### Added
- `Project.githubRepo String?` (`"owner/repo"` 형식) 필드 추가. Turso에도 `ALTER TABLE` 반영 (`7a82bb4`)
- `/projects/[projectKey]/settings` 신규 클라이언트 페이지: 설명·GitHub 레포 편집 폼. 권한 없는 사용자에게는 읽기 전용 안내 표시 (`7a82bb4`)
- 4개 프로젝트 탭 페이지(이슈 목록·칸반·스프린트·배포 이력)에 **설정** 링크 추가 (`7a82bb4`)
- E2E Journey 12 × 5건: 탭 노출, 폼 로드, 정상 저장, 형식 오류, 미인증 401 (`7a82bb4`) — 총 48개
- ADR-019 신규 (프로젝트 설정 1차 스코프 결정 기록)

### Changed
- `PATCH /api/projects/[projectId]` 권한: `role === "ADMIN"` → `role === "ADMIN" || createdById === user.userId` (프로젝트 생성자도 본인 프로젝트 메타 편집 가능) (`7a82bb4`)
- `PATCH` 응답 코드 분리: 401(미인증), 403(권한 부족), 404(없음). zod 오류 시 `details` 동반한 400 응답
- `updateSchema` 확장: `description`(max 2000, nullable), `githubRepo`(빈 문자열 또는 `^(?!.*\.\.)[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$`). 빈 문자열은 서버에서 `null`로 정규화
- `docs/user-guide.md`에 "프로젝트 설정 편집" 섹션 추가, 프로젝트 탭 목록 갱신 (설정 포함)
- `docs/e2e-testing-guide.md` 43개 → 48개, Journey 11개 → 12개 반영

### Fixed
- Settings 페이지 초기 렌더에서 `useEffect` 안에 `setState`를 호출하던 안티패턴(react-hooks/set-state-in-effect 린트 에러) 제거 — 폼을 별도 컴포넌트로 분리하고 `key={project.id}`로 mount 리셋
- 설정 폼의 label과 input을 `htmlFor`/`id`로 연결 (접근성 + Playwright `getByLabel` 매칭)

---

## [2026-04-21] 알림 Outbox Transactional 승격

### Added
- `src/lib/notification.ts`: `enqueueNotificationsTx(tx, inputs)` + `triggerNotificationDrain()` — outbox insert를 호출자의 `$transaction` 안에서만 수행하도록 타입으로 강제 (`a38aaa9`)

### Changed
- 이슈 PATCH: `issue.update` + `activity.createMany` + 알림 enqueue를 단일 `prisma.$transaction`으로 묶음 (`a38aaa9`)
- 댓글 POST: `comment.create` + `activity.create` + 알림 enqueue를 단일 `prisma.$transaction`으로 묶음 (`a38aaa9`)
- 스프린트 PATCH: `sprint.update` + 알림 enqueue를 단일 `prisma.$transaction`으로 묶음. assignee 목록 read는 tx 밖으로 분리해 write-only tx 유지 (libSQL 단일 라이터 lock 경쟁 최소화) (`a38aaa9`)
- `triggerNotificationDrain()`은 트랜잭션 커밋 성공 후에만 호출, 실제 알림이 enqueue된 경우에만 호출하도록 가드 추가
- ADR-018 아토믹성 보강 절 추가, HANDOFF "Outbox 진정한 아토믹성 미보장" 항목 제거

### Removed
- `createNotification` / `createNotifications` 기존 API — 호출자가 트랜잭션 밖에서 outbox에 insert하지 못하도록 삭제

### Fixed
- 본 요청 커밋 후 outbox insert 실패 시 알림 유실, 본 요청 롤백 후 outbox insert가 살아남아 유령 알림이 생기는 가능성 제거

---

## [2026-04-20] Phase 2·3 + 분리 이슈 일괄 처리

### Added
- Phase 2-1 스프린트: `Sprint` 모델, `Issue.sprintId`/`completedAt`, SVG 번다운 차트, 목록/생성/상세 페이지 (`9bdf6b0`)
- Phase 2-2 인앱 알림: `Notification` 모델, 헤더 벨 드롭다운(30초 폴링), 5종 트리거 통합 (`3783430`)
- Phase 3-1 파일 첨부: `Attachment` 모델 + Vercel Blob Private store + 프록시 다운로드 엔드포인트 + 드래그앤드롭 UI (`b263347`, `77b60a7`)
- Phase 3-2 GitHub Webhook: `GitHubLink` 모델 + HMAC SHA-256 검증 + PR 제목 이슈 키 자동 연결 + 머지 시 DONE 전환 (`fc81bff`)
- 알림 Outbox 패턴: `NotificationOutbox` + 인라인 드레인 + 일일 cron safety net (`ea877a4`, `5d2bf99`)
- E2E 테스트 22건 추가 (스프린트 6, 첨부 7, GitHub 6, 알림 Outbox 4 + 기타 회귀) — 총 43개
- ADR-013~018 추가 (스프린트/알림/Prisma 빌드/Blob/GitHub webhook/Outbox)
- 문서 현행화: user-guide에 Phase 2·3 섹션, e2e-testing-guide 43개 반영, feature-roadmap-plan 완료 표시

### Changed
- 이슈 PATCH에 `sprintId` 허용 + cross-project IDOR 검증
- 이슈 PATCH의 `completedAt` 자동 기록(status→DONE 전환 시)
- Issue API `?sprintId=none` 필터 추가로 백로그 조회 100개 제한 해소 (`287a804`)
- 알림 트리거가 Notification을 직접 생성 → NotificationOutbox에 insert 후 드레인 (ADR-018)
- 첨부 Blob store를 Public → Private로 재생성, 모든 접근이 서버 프록시 경유 (`77b60a7`)
- proxy.ts 공개 경로에 `/api/webhooks`, `/api/cron` 추가 (쿠키 없는 호출 허용)
- `.npmrc` + `next.config.ts serverExternalPackages` + `package.json build --webpack`으로 Vercel Prisma 7 호이스팅 이슈 해결 (`f04cb0d`)

### Fixed
- UUID로 시작하는 숫자가 `parseInt`로 잘못 해석돼 `issueNumber`로 조회되던 버그 (`/^\d+$/` 엄격 검사로 교체)
- 스프린트 생성 폼이 zod 상세 에러 메시지를 surface하지 않던 문제 (`43d33f3`)
- 알림 시스템 리뷰 지적사항 반영: `ids.max(100)`, link 내부 경로 검증, HTML 태그 제거 (`f4548ac`)
- 파일 첨부 보안 리뷰 반영: orphan blob 롤백, sanitizeFilename `..` 방어, 이슈당 20개 제한, MIME magic byte 교차 검증

### Removed
- 기존 Public Vercel Blob store 및 관련 Attachment 레코드 전부 (Private 마이그레이션)

---

## [2026-04-13] Phase 1 기능 고도화 + Dead Code 정리

### Added
- 리치 텍스트 에디터 (tiptap) — 이슈 설명/댓글에 마크다운 지원
- 이슈 활동 로그 — Activity 모델 + 변경 히스토리 타임라인 (댓글/활동/전체 탭)
- 저장된 필터 — SavedFilter 모델 + CRUD API + 필터 저장/적용 UI
- E2E 테스트 14개 추가 (리치 에디터 4, 활동 로그 4, 저장된 필터 6) — 총 21개
- Vercel 배포 완료 — https://devtracker-dusky.vercel.app
- 유사 오픈소스 리서치 문서 + 기능 로드맵 작업계획서

### Changed
- Issue PATCH/POST/Comment POST에 Activity 자동 생성
- 이슈 생성/상세: textarea → RichEditor 교체
- 이슈 목록: 저장된 필터 드롭다운 + 필터 저장 UI 추가

### Fixed
- 저장된 필터 적용 버그 — `handleApplyFilter`에서 JSON 문자열 파싱 누락

### Removed
- Dead code: `rich-viewer.tsx`, `src/lib/utils.ts`, 미사용 import/상수
- 미사용 npm 의존성 12개: `jose`, `react-hook-form`, `uuid`, `clsx`, `tailwind-merge` 등

---

## [2026-04-13] Turso(libSQL) 마이그레이션

### Changed
- DB를 로컬 SQLite(better-sqlite3) → Turso 클라우드(libSQL)로 전환
- `src/lib/prisma.ts` — `PrismaLibSql` factory 패턴으로 어댑터 교체
- `prisma/seed.ts` — Turso 어댑터로 시드 데이터 삽입
- `prisma/prisma.config.ts` — datasource URL 제거 (schema 경로만 유지)
- `CLAUDE.md` — Turso 관련 명령어/아키텍처 업데이트

### Removed
- `@prisma/adapter-better-sqlite3`, `better-sqlite3` 의존성 제거
- `@libsql/client` 직접 의존성 제거 (`@prisma/adapter-libsql`의 transitive dependency로 자동 설치됨)

---

## [2026-04-12] 보안 강화 및 코드리뷰 반영

### Added
- `src/proxy.ts` 재작성 — `auth.ts`의 verify 함수 import, 인증 미들웨어 정상 동작
- `src/app/error.tsx` — 글로벌 에러 바운더리 (프로덕션 시 에러 메시지 숨김)
- `src/app/not-found.tsx` — 404 페이지
- `next.config.ts` 보안 헤더 — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- E2E 테스트 7개 — Playwright 기반 (로그인, 대시보드, 프로젝트 네비게이션)
- `docs/PLAN.md` — 프로젝트 구현 계획서
- `docs/ted-run-guide.md` — /ted-run 명령어 사용 가이드
- `docs/e2e-testing-guide.md` — E2E 테스트 실행/작성 가이드
- `@prisma/client-runtime-utils` 의존성 추가 (Turbopack 호환)

### Changed
- `src/lib/auth.ts` — JWT secret fallback 제거, lazy 함수로 환경변수 필수화. `isJwtPayload` typeof 검증 강화
- 모든 API route에 projectId 범위 검증 추가 (cross-project IDOR 방지)
- Project PATCH/DELETE, Deployment PATCH에 ADMIN 역할 체크 추가
- Deployment POST — PROD 배포 생성은 ADMIN만 가능
- Issue DELETE에 프로젝트 소속 확인 + try/catch 추가
- Issue 번호 생성을 `$transaction`으로 감싸서 race condition 해결
- Board 일괄 업데이트를 `$transaction`으로 변경 + 이슈 프로젝트 소속 검증
- Comment GET/POST에 projectId → issueId 범위 검증 추가
- `issues/route.ts` — limit 상한 100, page/limit NaN 방어
- `deployments/route.ts` — environment 쿼리 파라미터 enum 검증
- 모든 페이지 `queryFn`에 `r.ok` 체크 추가
- `src/hooks/use-auth.ts` — 무한 루프 수정 (빈 deps + useRef)
- `src/stores/auth-store.ts` — logout `.catch().finally()` 추가
- `src/components/common/status-badge.tsx` — 상수 중복 제거, `types/` import

### Fixed
- JWT fallback secret 하드코딩 보안 취약점
- proxy.ts 미들웨어 미동작 (파일명/함수명 수정)
- Issue GET handler IDOR 취약점 (UUID 접근 시 projectId 미검증)
- Board PATCH cross-project 이슈 조작 가능 취약점
- Deployment PATCH/POST 권한 미체크 취약점
- useAuth 인증 실패 시 무한 fetch 루프
- proxy.ts verify 호출 시 env 변수 미설정 크래시

### Removed
- `src/middleware.ts` — Next.js 16에서 deprecated (proxy.ts로 대체)
