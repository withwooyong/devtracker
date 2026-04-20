# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

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
