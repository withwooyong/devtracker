# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

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
