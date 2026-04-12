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
npx prisma db push    # 스키마를 DB에 반영 (migration 없이)
npx tsx prisma/seed.ts  # 시드 데이터 삽입 (모든 계정 비밀번호: yanadoo123)
```

## Tech Stack

- **Next.js 16** + React 19, TypeScript, Tailwind CSS v4
- **Prisma 7** with **better-sqlite3** adapter (DB 파일: `prisma/dev.db`)
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

### Prisma (SQLite)
- `src/lib/prisma.ts` — PrismaBetterSqlite3 어댑터로 직접 연결 (DATABASE_URL 미사용)
- DB 경로는 `path.join(process.cwd(), "prisma", "dev.db")`로 결정됨
- `prisma/prisma.config.ts` — Prisma CLI 설정

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
