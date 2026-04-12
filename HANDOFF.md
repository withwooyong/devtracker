# Session Handoff

> Last updated: 2026-04-12 (KST)
> Branch: `main`
> Latest commit: `ae582c6` - DevTracker 초기 구현: 개발 업무/배포 관리 시스템

## Current Status

보안 강화 + 코드리뷰 반영 작업 완료. 코드리뷰 2라운드 통과 (CRITICAL 0, HIGH 0), TypeScript 컴파일 성공, E2E 테스트 7/7 통과. **아직 커밋/푸시되지 않은 상태.**

## Completed This Session

| # | Task | Files |
|---|------|-------|
| 1 | JWT secret fallback 제거 + 환경변수 필수화 | `src/lib/auth.ts` |
| 2 | proxy.ts 재작성 (auth.ts import, try/catch) | `src/proxy.ts` |
| 3 | 모든 API route 인가 체크 + projectId 범위 검증 | 7개 API route 파일 |
| 4 | Issue 번호 생성 race condition 해결 ($transaction) | `issues/route.ts` |
| 5 | Board 일괄 업데이트 $transaction + 프로젝트 소속 검증 | `board/route.ts` |
| 6 | useAuth 무한 루프 수정 | `src/hooks/use-auth.ts` |
| 7 | 보안 헤더 + limit 상한 + queryFn ok 체크 | `next.config.ts`, 7개 페이지 |
| 8 | error.tsx, not-found.tsx, logout catch, 상수 중복 제거 | 4개 파일 |
| 9 | E2E 테스트 7개 작성 (Playwright) | `tests/e2e/`, `playwright.config.ts` |
| 10 | 문서 작성 (PLAN.md, ted-run-guide, e2e-guide, CLAUDE.md) | `docs/`, `CLAUDE.md` |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 커밋 및 푸시 | 대기 | 사용자 확인 후 진행 |

## Key Decisions Made

- **Next.js 16 proxy.ts**: `middleware.ts` deprecated → `proxy.ts`가 공식 파일 컨벤션. 함수명도 `proxy`로 export
- **JWT secret lazy evaluation**: 빌드 시점에 환경변수 없으면 에러 발생 방지를 위해 `getJwtSecret()` 함수 호출 방식으로 변경
- **Deployment 권한**: PROD 배포 생성은 ADMIN만. Deployment PATCH(상태 변경)도 ADMIN만. DEV/STAGING 배포는 MEMBER 허용
- **proxy.ts에서 Prisma 대신 auth.ts import**: 미들웨어에서 직접 DB 접근 대신 JWT 토큰 검증 함수만 사용
- **useAuth**: 빈 deps 배열 + useRef로 컴포넌트 마운트당 1회만 fetch. 로그아웃 시 페이지 리다이렉트로 컴포넌트 언마운트

## Known Issues

- **Prisma + Turbopack 빌드 에러**: `pnpm build`가 `@prisma/client-runtime-utils` 모듈 로딩 실패로 실패. `pnpm dev`는 정상 동작. Prisma 7 + Next.js 16 Turbopack 호환성 문제로 추정
- **코드리뷰 MEDIUM 미수정 건**: 프로젝트 생성(POST /api/projects)에 ADMIN 체크 없음 (의도적), 404 에러 메시지 불일치("프로젝트 없음" vs "프로젝트를 찾을 수 없습니다."), CSP 헤더 미설정
- **react-hook-form 미사용**: 의존성 설치되어 있으나 모든 폼이 useState로 구현. Zod 클라이언트 검증 없음
- **Board 100개 제한**: limit=100으로 캡. 이슈 100개 초과 프로젝트에서 불완전한 보드 표시 가능
- **Refresh token 서버 측 무효화 불가**: 로그아웃해도 토큰 7일간 유효

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- 이번 세션에서 코드리뷰 기반 보안 강화를 완료. 커밋/푸시 대기 상태
- GitHub 레포: `withwooyong/devtracker`
- 시드 데이터 비밀번호: `yanadoo123` (모든 계정 동일)
- ADMIN 계정: `withwooyong@yanadoocorp.com` (Ted)

## Files Modified This Session

```
 CLAUDE.md
 CHANGELOG.md (new)
 HANDOFF.md (new)
 next.config.ts
 package.json
 pnpm-lock.yaml
 docs/PLAN.md (new)
 docs/ted-run-guide.md (new)
 docs/e2e-testing-guide.md (new)
 playwright.config.ts (new)
 src/app/error.tsx (new)
 src/app/not-found.tsx (new)
 src/proxy.ts
 src/lib/auth.ts
 src/hooks/use-auth.ts
 src/stores/auth-store.ts
 src/components/common/status-badge.tsx
 src/app/api/projects/[projectId]/route.ts
 src/app/api/projects/[projectId]/board/route.ts
 src/app/api/projects/[projectId]/issues/route.ts
 src/app/api/projects/[projectId]/issues/[issueId]/route.ts
 src/app/api/projects/[projectId]/issues/[issueId]/comments/route.ts
 src/app/api/projects/[projectId]/deployments/route.ts
 src/app/api/projects/[projectId]/deployments/[deploymentId]/route.ts
 src/app/dashboard/page.tsx
 src/app/projects/page.tsx
 src/app/projects/[projectKey]/page.tsx
 src/app/projects/[projectKey]/board/page.tsx
 src/app/projects/[projectKey]/deployments/page.tsx
 src/app/projects/[projectKey]/issues/new/page.tsx
 src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx
 tests/e2e/ (new, 6 files)
```
