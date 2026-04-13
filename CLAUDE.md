# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Overview

DevTracker - 야나두 개발팀(5~20명)의 업무 처리, 진행 상황, 배포 이력을 관리하는 Jira 대안 시스템.
UI 텍스트와 API 에러 메시지는 한글로 작성한다.

## Commands

```bash
pnpm dev              # 개발 서버 (http://localhost:3000)
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint
npx prisma generate   # Prisma 클라이언트 생성 (스키마 변경 후 필수)
npx prisma db push --url "file:./prisma/dev.db"  # 로컬 SQLite에 스키마 반영
sqlite3 prisma/dev.db .dump | turso db shell devtracker  # Turso에 스키마 적용
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx prisma/seed.ts  # 시드 데이터
```

## Tech Stack

- **Next.js 16** + React 19, TypeScript, Tailwind CSS v4
- **Prisma 7** with **Turso (libSQL)** adapter — 클라우드 SQLite
- **pnpm** 패키지 매니저
- Client state: **Zustand** / Server state: **TanStack React Query**
- Form: react-hook-form + zod, Auth: jsonwebtoken + bcryptjs
- Drag & drop: @dnd-kit

## Architecture

### Auth Flow
JWT 기반 인증. httpOnly 쿠키에 access token(15분) + refresh token(7일) 저장.
- `src/lib/auth.ts` — 토큰 생성/검증, `getCurrentUser()`, 쿠키 설정/삭제
- 모든 API route handler에서 `getCurrentUser()`로 인증 확인
- 클라이언트: `useAuthStore` (Zustand) + `useAuth` hook이 `/api/auth/me`로 세션 확인

### Prisma (Turso/libSQL)
- `src/lib/prisma.ts` — `PrismaLibSql` 어댑터로 Turso 클라우드 DB 연결
- 환경변수: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (`.env.local`)
- 스키마 적용: `npx prisma db push --url "file:./prisma/dev.db"` 후 `turso db shell devtracker < dump.sql`
- `prisma/prisma.config.ts` — Prisma CLI 설정 (schema 경로만)

### API Routes
REST API 패턴: `/api/projects/[projectId]/issues/[issueId]/comments`
- zod로 요청 body 유효성 검증
- 모든 응답은 `NextResponse.json()` 사용

### Client State
- `src/stores/auth-store.ts` — 인증 상태 (Zustand)
- `src/stores/filter-store.ts` — 필터 상태 (Zustand)
- `src/components/providers.tsx` — QueryClientProvider 래퍼

### Path Alias
`@/*` → `./src/*`
