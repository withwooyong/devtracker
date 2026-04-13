# Session Handoff

> Last updated: 2026-04-13 (KST)
> Branch: `main`
> Latest commit: `87d422c` - 유사 오픈소스 리서치 문서 추가
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1 기능 3개 (리치 텍스트 에디터, 활동 로그, 저장된 필터) + dead code 정리 완료. E2E 21/21 통과. **커밋/푸시 대기 상태.**

## Completed This Session

| # | Task | Files |
|---|------|-------|
| 1 | 코드리뷰 + 보안 강화 | 30+ 파일 (JWT, proxy.ts, 인가 체크, IDOR 방지) |
| 2 | Turso(libSQL) 마이그레이션 | `prisma.ts`, `seed.ts`, `package.json` |
| 3 | Vercel 배포 | 환경변수 4개, git email 수정, protection 해제 |
| 4 | 리치 텍스트 에디터 (tiptap) | `rich-editor.tsx`, `issues/new`, `issues/[issueNumber]` |
| 5 | 이슈 활동 로그 | Activity 모델, API, 타임라인 컴포넌트, 댓글/활동/전체 탭 |
| 6 | 저장된 필터 | SavedFilter 모델, CRUD API, 필터 저장/적용 UI |
| 7 | E2E 테스트 21개 | 기존 7 + 리치에디터 4 + 활동로그 4 + 저장필터 6 |
| 8 | Dead code 정리 | 파일 2개 삭제, import/상수 정리, npm 의존성 12개 제거 |
| 9 | 문서 | PLAN.md, ted-run-guide, e2e-guide, open-source-research, feature-roadmap-plan |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 커밋/푸시 | 대기 | Phase 1 + dead code 정리 변경사항 |
| 2 | Vercel 재배포 | 대기 | 커밋 후 자동 또는 수동 |

## Key Decisions Made

- **tiptap 에디터**: `immediatelyRender: false` (SSR 호환), 툴바에 `onMouseDown` + `preventDefault` (포커스 유지)
- **활동 로그**: Issue PATCH 시 기존 이슈를 먼저 조회 → diff 비교 → Activity createMany. 댓글/활동/전체 탭 (GitHub Issues 스타일)
- **저장된 필터**: `filters` 필드를 JSON 문자열로 저장. 적용 시 `JSON.parse` 필수 (버그 발견 후 수정)
- **Dead code**: `rich-viewer.tsx` 삭제 (미사용), `jose`/`react-hook-form` 등 12개 의존성 제거
- **Prisma 7 adapter-libsql**: factory 패턴 `PrismaLibSql({url, authToken})` — `@libsql/client` 직접 import 불필요

## Known Issues

- **Prisma CLI `libsql://` 미지원**: 스키마 변경 시 `prisma db push --url "file:./prisma/dev.db"` → `sqlite3 dump` → `turso db shell` 우회 필요
- **Prisma + Turbopack 빌드**: `pnpm build` 실패 가능 (Vercel 빌드는 정상)
- **Board 100개 제한**: limit=100 캡. 초과 시 불완전 보드 표시
- **Refresh token 서버 측 무효화 불가**: 로그아웃해도 7일간 유효
- **프로젝트 생성 ADMIN 체크 없음**: 의도적 — 모든 멤버가 프로젝트 생성 가능
- **CSP 헤더 미설정**: XSS 추가 방어 필요 시 추후 적용

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- Phase 1 완료, **Phase 2 (스프린트/사이클 + 알림 시스템)** 이 다음 작업
- 작업계획서: `docs/feature-roadmap-plan.md`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker`
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Files Modified This Session (uncommitted)

```
 prisma/schema.prisma (Activity, SavedFilter 모델 추가)
 package.json + pnpm-lock.yaml (tiptap 추가, 12개 의존성 제거)
 src/components/common/rich-editor.tsx (new)
 src/components/common/activity-timeline.tsx (new)
 src/types/activity.ts (new)
 src/types/filter.ts (new)
 src/app/api/projects/[projectId]/issues/[issueId]/activities/route.ts (new)
 src/app/api/projects/[projectId]/filters/route.ts (new)
 src/app/api/projects/[projectId]/filters/[filterId]/route.ts (new)
 src/app/api/projects/[projectId]/issues/[issueId]/route.ts (activity 기록)
 src/app/api/projects/[projectId]/issues/route.ts (CREATED activity)
 src/app/api/projects/[projectId]/issues/[issueId]/comments/route.ts (COMMENT_ADDED activity)
 src/app/projects/[projectKey]/issues/new/page.tsx (RichEditor)
 src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx (RichEditor + 활동 탭)
 src/app/projects/[projectKey]/page.tsx (저장된 필터 UI)
 src/app/projects/[projectKey]/board/page.tsx (dead code 제거)
 src/types/deployment.ts (ENV_LABELS 제거)
 src/lib/utils.ts (deleted)
 src/components/common/rich-viewer.tsx (deleted)
 tests/e2e/rich-editor.spec.ts (new)
 tests/e2e/activity-log.spec.ts (new)
 tests/e2e/saved-filters.spec.ts (new)
 docs/feature-roadmap-plan.md (new)
 docs/open-source-research.md (new)
 CHANGELOG.md
 HANDOFF.md
```
