# Session Handoff

> Last updated: 2026-04-13 (KST)
> Branch: `main`
> Latest commit: `aa53edc` - 보안 강화 및 코드리뷰 반영: 인가 체크, IDOR 방지, E2E 테스트

## Current Status

Turso(libSQL) 마이그레이션 완료. 로컬 SQLite(better-sqlite3) → Turso 클라우드 DB 전환. 로컬 검증 통과 (로그인/API/proxy 동작 확인). **커밋/푸시 대기 상태.** Vercel 배포는 미진행.

## Completed This Session

| # | Task | Files |
|---|------|-------|
| 1 | Turso DB 생성 (aws-ap-northeast-1) | CLI |
| 2 | 의존성 교체: better-sqlite3 → @prisma/adapter-libsql | `package.json` |
| 3 | Prisma 어댑터 교체 (factory 패턴) | `src/lib/prisma.ts`, `prisma/seed.ts` |
| 4 | Turso에 스키마 적용 + 시드 데이터 삽입 | CLI |
| 5 | 로컬 검증 (로그인, API, proxy) | 수동 테스트 |
| 6 | CLAUDE.md, CHANGELOG.md 현행화 | `CLAUDE.md`, `CHANGELOG.md` |
| 7 | 마이그레이션 작업계획서 작성 | `docs/turso-vercel-migration-plan.md` |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 커밋/푸시 | 대기 | 사용자 확인 후 진행 |
| 2 | Vercel 배포 | 미시작 | vercel link → env 설정 → deploy |

## Key Decisions Made

- **Prisma 7 adapter-libsql factory 패턴**: `PrismaLibSql({url, authToken})` — Prisma 7에서는 createClient를 어댑터 내부에서 호출. 직접 `@libsql/client` import 불필요
- **스키마 적용 방식**: Prisma CLI가 `libsql://` 프로토콜 미지원 → 로컬 SQLite에 `db push` 후 `.dump` → `turso db shell`로 적용
- **prisma.config.ts**: datasource URL 제거 (Prisma 7에서 런타임 URL 충돌 방지). CLI에서는 `--url` 옵션으로 전달

## Known Issues

- **Prisma CLI `libsql://` 미지원**: `prisma db push`가 libSQL URL을 인식하지 못함. 스키마 변경 시 로컬 SQLite → dump → turso shell 우회 필요
- **Vercel 배포 미완**: 환경변수 설정 + 배포 필요
- **Prisma + Turbopack 빌드 에러**: `pnpm build`가 여전히 실패 (`@prisma/client-runtime-utils`). dev 서버는 정상
- 이전 세션 Known Issues 유지 (코드리뷰 MEDIUM 건, react-hook-form 미사용, Board 100개 제한 등)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 Vercel에 배포하려 함
- Turso DB 생성 완료, 시드 데이터 적재 완료, 로컬 검증 통과
- **다음 단계: Vercel 배포** (`vercel link` → 환경변수 4개 설정 → `vercel --prod`)
- 환경변수: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
- Turso DB URL: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub 레포: `withwooyong/devtracker`
- ADMIN 계정: `withwooyong@yanadoocorp.com` / 비밀번호: `yanadoo123`

## Files Modified This Session

```
 CLAUDE.md
 CHANGELOG.md
 HANDOFF.md
 package.json
 pnpm-lock.yaml
 prisma/prisma.config.ts
 prisma/seed.ts
 src/lib/prisma.ts
 docs/turso-vercel-migration-plan.md (new)
```
