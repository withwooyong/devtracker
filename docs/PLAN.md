# DevTracker - 개발 업무/배포 관리 시스템 구현 계획서

## Context

야나두 개발팀(5~20명)의 업무 처리, 진행 상황, 배포 이력을 관리하는 Jira 대안 시스템.
기존 야나두 회계 시스템과 독립된 프로젝트로, Next.js 풀스택 + SQLite로 구축한다.

## Tech Stack

| 영역 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript |
| DB | SQLite (Prisma 7 + better-sqlite3 adapter) |
| Auth | JWT (access 15분 / refresh 7일) + bcryptjs, httpOnly 쿠키 |
| Client State | Zustand |
| Server State | TanStack React Query v5 |
| UI | Tailwind CSS v4 |
| Form | react-hook-form + zod |
| DnD | @dnd-kit |
| Package Manager | pnpm |

## Data Model

```
User ──┬── Project (createdBy)
       ├── Issue (reporter)
       ├── Issue (assignee)
       ├── Comment (author)
       └── Deployment (deployedBy)

Project ──┬── Issue ── Comment
          ├── Label ──── Issue (M:N)
          └── Deployment
```

### 모델 상세

| 모델 | 주요 필드 | 비고 |
|------|----------|------|
| User | email(unique), password, name, role(ADMIN/MEMBER) | 관리자/일반 멤버 구분 |
| Project | name, key(unique, 영문 대문자), description | key로 URL 라우팅 |
| Issue | issueNumber, title, status, priority, kanbanOrder, dueDate | projectId+issueNumber 복합 유니크 |
| Label | name, color(hex) | projectId+name 복합 유니크 |
| Comment | content, authorId | Issue에 종속 |
| Deployment | version, environment(DEV/STAGING/PROD), status, changes | 배포 이력 추적 |

### Enum 값

- **Issue Status**: TODO → IN_PROGRESS → IN_REVIEW → DONE
- **Issue Priority**: LOW / MEDIUM / HIGH / CRITICAL
- **Deploy Environment**: DEV / STAGING / PROD
- **Deploy Status**: PENDING → IN_PROGRESS → SUCCESS / FAILED / ROLLED_BACK

## API 설계

### 인증 (Auth)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 로그인 (email/password → 쿠키 설정) |
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/logout` | 로그아웃 (쿠키 삭제) |
| GET | `/api/auth/me` | 현재 사용자 조회 |
| POST | `/api/auth/refresh` | 토큰 갱신 |

### 사용자 (Users)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/users` | 전체 사용자 목록 |

### 프로젝트 (Projects)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects` | 프로젝트 목록 (이슈/배포 count 포함) |
| POST | `/api/projects` | 프로젝트 생성 |
| GET | `/api/projects/[projectId]` | 프로젝트 상세 |
| PATCH | `/api/projects/[projectId]` | 프로젝트 수정 |
| DELETE | `/api/projects/[projectId]` | 프로젝트 삭제 (ADMIN only) |

### 이슈 (Issues)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects/[projectId]/issues` | 이슈 목록 (필터: status, priority, assigneeId, search) |
| POST | `/api/projects/[projectId]/issues` | 이슈 생성 |
| GET | `/api/projects/[projectId]/issues/[issueId]` | 이슈 상세 (댓글 포함) |
| PATCH | `/api/projects/[projectId]/issues/[issueId]` | 이슈 수정 |
| DELETE | `/api/projects/[projectId]/issues/[issueId]` | 이슈 삭제 |

### 칸반 보드 (Board)

| Method | Endpoint | 설명 |
|--------|----------|------|
| PATCH | `/api/projects/[projectId]/board` | 이슈 상태/순서 일괄 업데이트 (DnD) |

### 댓글 (Comments)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects/[projectId]/issues/[issueId]/comments` | 댓글 목록 |
| POST | `/api/projects/[projectId]/issues/[issueId]/comments` | 댓글 작성 |

### 라벨 (Labels)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects/[projectId]/labels` | 라벨 목록 |
| POST | `/api/projects/[projectId]/labels` | 라벨 생성 |

### 배포 (Deployments)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/projects/[projectId]/deployments` | 배포 목록 (환경 필터) |
| POST | `/api/projects/[projectId]/deployments` | 배포 생성 |
| GET | `/api/projects/[projectId]/deployments/[deploymentId]` | 배포 상세 |
| PATCH | `/api/projects/[projectId]/deployments/[deploymentId]` | 배포 상태 업데이트 |

## 페이지 구성

| 경로 | 설명 |
|------|------|
| `/login` | 로그인/회원가입 (토글) |
| `/` | → `/dashboard` 리다이렉트 |
| `/dashboard` | 프로젝트 카드 그리드 (이슈/배포 count) |
| `/projects` | 프로젝트 목록 + 인라인 생성 폼 |
| `/projects/[projectKey]` | 이슈 목록 (필터, 페이지네이션) |
| `/projects/[projectKey]/issues/new` | 이슈 생성 폼 |
| `/projects/[projectKey]/issues/[issueNumber]` | 이슈 상세 + 댓글 + 인라인 편집 |
| `/projects/[projectKey]/board` | 칸반 보드 (DnD) |
| `/projects/[projectKey]/deployments` | 배포 이력 (환경별 탭) |
| `/projects/[projectKey]/deployments/new` | 배포 생성 폼 |

## 인증 아키텍처

```
[로그인] → POST /api/auth/login
         → JWT access token (15분) + refresh token (7일)
         → httpOnly 쿠키에 저장

[API 요청] → getCurrentUser()로 쿠키에서 토큰 검증
           → access token 만료 시 refresh token으로 자동 갱신

[페이지 보호] → useAuth() hook이 /api/auth/me 호출
             → MainLayout에서 인증 상태 확인
             → 미인증 시 /login 리다이렉트
```

## 클라이언트 상태 관리

| Store | 역할 |
|-------|------|
| `auth-store` (Zustand) | user 객체, 로딩 상태, logout 액션 |
| `filter-store` (Zustand) | 이슈 필터 (status, priority, assigneeId, search) |
| React Query | 서버 데이터 캐싱 (staleTime: 30초, retry: 1) |

## 공통 컴포넌트

| 컴포넌트 | 설명 |
|----------|------|
| `MainLayout` | Sidebar + Header + 콘텐츠 래퍼, 인증 체크 |
| `Sidebar` | 네비게이션 (Dashboard, Projects), 사용자 프로필 |
| `Header` | pathname 기반 브레드크럼 |
| `StatusBadge` | 이슈 상태/우선순위/배포 상태/환경 뱃지 |
| `Providers` | QueryClientProvider 래퍼 |

## 시드 데이터

- **사용자 11명** (ADMIN 1명: Ted, MEMBER 10명) — 비밀번호: `yanadoo123`
- **프로젝트 2개**: 야나두 개발(DEV), 인프라 운영(OPS)
- **라벨 5개/프로젝트**: 버그, 기능, 개선, 긴급, 문서
- **이슈 8개** (DEV 프로젝트): 다양한 상태/우선순위/담당자 조합
- **배포 1건**: v1.0.0 PROD SUCCESS

## 구현 순서

1. **프로젝트 초기화**: Next.js 16 + TypeScript + Tailwind CSS v4 + pnpm
2. **DB 스키마**: Prisma schema 정의 + better-sqlite3 어댑터 설정
3. **인증 시스템**: JWT 토큰 발급/검증, 쿠키 관리, auth API routes
4. **타입 정의**: User, Project, Issue, Deployment 타입 + 상수
5. **상태 관리**: Zustand stores + React Query provider
6. **레이아웃**: Sidebar, Header, MainLayout
7. **페이지 구현**: 로그인 → 대시보드 → 프로젝트 → 이슈 → 칸반 → 배포
8. **API Routes**: CRUD endpoints (프로젝트, 이슈, 댓글, 라벨, 배포)
9. **시드 데이터**: 테스트용 사용자/프로젝트/이슈/배포 데이터
10. **UI 개선**: input/textarea 가독성, shadcn UI 스타일 적용
