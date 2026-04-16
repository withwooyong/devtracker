# Architecture Decision Records (ADR)

DevTracker 프로젝트에서 내린 주요 아키텍처 결정을 기록한다.

---

## ADR-001: Next.js 16 풀스택 단일 프로젝트

**날짜**: 2026-04-12
**상태**: 채택

### 맥락
야나두 개발팀(5~20명)을 위한 Jira 대안 시스템이 필요했다. 백엔드 + 프론트엔드를 별도로 구축할지, 풀스택 프레임워크로 단일 프로젝트로 할지 결정이 필요했다.

### 결정
Next.js 16 App Router로 프론트엔드와 API를 단일 프로젝트에서 구현한다.

### 근거
- 소규모 팀 도구로 별도 백엔드 서버 운영 부담 불필요
- API Routes로 REST API 구현 가능, 별도 Express/NestJS 불필요
- Vercel 무료 배포와 최적 호환
- 프론트엔드/백엔드 타입 공유 용이 (TypeScript)

### 결과
- API route handler에서 `getCurrentUser()`로 인증 확인하는 패턴 정착
- `proxy.ts`(Next.js 16의 middleware 대체)로 라우트 보호
- 프론트엔드와 백엔드가 같은 배포 단위로 관리됨

---

## ADR-002: SQLite(Turso/libSQL) 선택

**날짜**: 2026-04-12 (초기), 2026-04-13 (Turso 마이그레이션)
**상태**: 채택

### 맥락
DB 선택이 필요했다. PostgreSQL, MySQL, SQLite, MongoDB 등의 옵션이 있었다. 이후 Vercel 배포를 위해 클라우드 DB로 전환이 필요했다.

### 결정
초기에 SQLite(better-sqlite3)로 시작하고, 배포 시점에 Turso(libSQL, 클라우드 SQLite)로 마이그레이션한다.

### 근거
- 5~20명 규모에 SQLite 성능 충분
- 별도 DB 서버 운영 불필요
- Turso 무료 티어: 500 DB, 9GB, 500M 읽기/월 — 충분
- libSQL은 SQLite 포크로 스키마 변경 없이 마이그레이션 가능
- Prisma 7의 `@prisma/adapter-libsql` 공식 지원

### 결과
- Prisma CLI가 `libsql://` 프로토콜 미지원 → 스키마 변경 시 로컬 SQLite dump → turso db shell 우회 필요
- Prisma 7 adapter-libsql은 factory 패턴: `PrismaLibSql({url, authToken})` — `@libsql/client` 직접 import 불필요

---

## ADR-003: JWT httpOnly 쿠키 인증

**날짜**: 2026-04-12
**상태**: 채택

### 맥락
사용자 인증 방식을 결정해야 했다. 세션 기반, JWT, OAuth 등의 옵션이 있었다.

### 결정
JWT 토큰을 httpOnly 쿠키에 저장한다. Access token 15분 + Refresh token 7일.

### 근거
- httpOnly 쿠키로 XSS 공격에서 토큰 탈취 방지
- 서버 측 세션 저장소 불필요 (SQLite에 세션 테이블 관리 부담 제거)
- Access/Refresh 이중 토큰으로 보안과 UX 균형

### 단점 (수용)
- Refresh token 서버 측 무효화 불가 — 로그아웃해도 토큰 7일간 유효
- JWT payload에 role 포함 → DB에서 role 변경 시 토큰 만료까지 반영 안 됨
- CSRF 추가 보호 미적용 (sameSite: lax로 부분 방어)

### 결과
- `src/lib/auth.ts`에 토큰 생성/검증/갱신 로직 집중
- `getCurrentUser()`가 access token 만료 시 refresh token으로 자동 갱신
- `src/proxy.ts`(미들웨어)에서 라우트 보호 (인증 없으면 /login 리다이렉트)

---

## ADR-004: Next.js 16 proxy.ts (middleware 대체)

**날짜**: 2026-04-12
**상태**: 채택

### 맥락
Next.js 16에서 `middleware.ts`가 deprecated되고 `proxy.ts`로 변경되었다. 기존 Next.js 지식과 다른 breaking change.

### 결정
`src/proxy.ts`에 `proxy` 함수를 export하여 라우트 보호를 구현한다. Node.js Runtime에서 실행되므로 `jsonwebtoken` 라이브러리 사용 가능.

### 근거
- Next.js 16 공식 문서: `middleware.ts` → `proxy.ts` 파일 컨벤션 변경
- 함수명도 `middleware` → `proxy`로 변경
- Node.js Runtime이 기본 (Edge Runtime 아님) → 네이티브 모듈 사용 가능

### 결과
- `src/proxy.ts`에서 `auth.ts`의 `verifyAccessToken`/`verifyRefreshToken` import하여 사용
- try/catch로 감싸서 환경변수 미설정 시에도 크래시 방지 (graceful 리다이렉트)
- PUBLIC_PATHS (`/login`, `/api/auth`) 외 모든 경로에 인증 요구

---

## ADR-005: Zustand + TanStack React Query 상태 관리

**날짜**: 2026-04-12
**상태**: 채택

### 맥락
클라이언트 상태와 서버 상태를 어떻게 관리할지 결정이 필요했다. Redux, Zustand, React Query, SWR 등의 옵션이 있었다.

### 결정
- **Zustand**: 클라이언트 UI 상태 (인증 정보, 필터 설정)
- **TanStack React Query**: 서버 데이터 캐싱 (프로젝트, 이슈, 배포 등)

### 근거
- Zustand: 보일러플레이트 최소, 번들 크기 작음, React 외부에서도 사용 가능
- React Query: 서버 데이터 캐싱, 자동 재검증, 뮤테이션 관리에 특화
- 두 라이브러리의 역할이 명확히 분리됨

### 결과
- `src/stores/auth-store.ts` — 인증 상태 (user, isLoading, logout)
- `src/stores/filter-store.ts` — 이슈 필터 상태 (status, priority, assigneeId, search)
- 각 페이지에서 `useQuery`/`useMutation`으로 서버 데이터 fetch
- React Query defaultOptions: `staleTime: 30초`, `retry: 1`

---

## ADR-006: REST API 설계 패턴

**날짜**: 2026-04-12
**상태**: 채택

### 맥락
API 설계 방식을 결정해야 했다. REST, GraphQL, tRPC 등의 옵션이 있었다.

### 결정
중첩 REST API 패턴: `/api/projects/[projectId]/issues/[issueId]/comments`

### 근거
- Next.js App Router의 파일 기반 라우팅과 자연스럽게 매핑
- 팀 규모 대비 GraphQL의 복잡성은 과도
- tRPC는 풀스택 타입 안전성 제공하지만, 학습 곡선과 프로젝트 규모 대비 오버엔지니어링
- Zod로 요청 body 검증하여 타입 안전성 확보

### 결과
- 모든 API route에서 `getCurrentUser()`로 인증 확인
- Zod schema로 POST/PATCH body 검증
- projectId 범위 검증으로 cross-project 접근 방지 (IDOR 방지)
- ADMIN 역할 체크: 프로젝트 수정/삭제, PROD 배포, 배포 상태 변경

---

## ADR-007: JWT Secret 환경변수 필수화

**날짜**: 2026-04-12
**상태**: 채택 (보안 코드리뷰 결과)

### 맥락
초기 구현에서 JWT_SECRET에 fallback 값(`"fallback-secret"`)이 있어 환경변수 미설정 시에도 서버가 시작되었다. 코드리뷰에서 CRITICAL로 분류됨.

### 결정
fallback 제거. 환경변수가 없으면 런타임 에러를 발생시킨다. 단, 빌드 시점 에러 방지를 위해 lazy evaluation(함수 호출) 방식 사용.

### 근거
- 소스 코드에 공개된 fallback 값으로 JWT 위조 가능
- 빌드 시점에는 환경변수가 없을 수 있어 모듈 로드 시점이 아닌 함수 호출 시점에 체크

### 결과
```typescript
function getJwtSecret() { return getSecret("JWT_SECRET"); }
function getRefreshSecret() { return getSecret("JWT_REFRESH_SECRET"); }
```

---

## ADR-008: Vercel 배포 + Turso 조합

**날짜**: 2026-04-13
**상태**: 채택

### 맥락
프로덕션 배포 환경을 결정해야 했다. Vercel은 서버리스로 파일 시스템 SQLite 사용 불가.

### 결정
Vercel (무료) + Turso (무료)로 배포한다.

### 근거
- 둘 다 영구 무료 티어 제공
- Turso는 SQLite 호환 → 스키마 변경 없음
- Vercel은 Next.js 최적 배포 플랫폼
- GitHub 연동으로 push 시 자동 배포

### 주의사항
- Vercel 환경변수에 따옴표 포함하면 안 됨 (`printf`로 설정)
- `prisma generate`를 build 스크립트에 포함 필수
- `prisma/seed.ts`는 tsconfig exclude 필요 (빌드 시 타입체크 대상 제외)
- Deployment Protection 비활성화 필요 (공개 접근용)

---

## ADR-009: tiptap 리치 텍스트 에디터

**날짜**: 2026-04-13
**상태**: 채택

### 맥락
이슈 설명과 댓글에 서식 지원이 필요했다. Markdown 렌더링만 할지, WYSIWYG 에디터를 도입할지 결정.

### 결정
tiptap (헤드리스 에디터, ProseMirror 기반)을 도입한다. HTML 문자열로 저장.

### 근거
- MIT 라이선스, React 공식 지원
- 헤드리스 → Tailwind CSS로 자유롭게 스타일링
- StarterKit으로 기본 서식 (볼드, 이탤릭, 리스트, 코드블록 등) 즉시 사용
- DB 스키마 변경 없음 (기존 String 필드에 HTML 저장)

### 주의사항
- `immediatelyRender: false` 필수 (SSR 호환)
- 툴바 버튼에 `onMouseDown` + `preventDefault` 사용 (에디터 포커스 유지)
- `setContent` 시 `{ emitUpdate: false }` 옵션 (tiptap v3 변경사항)

---

## ADR-010: Issue 활동 로그 (Activity 모델)

**날짜**: 2026-04-13
**상태**: 채택

### 맥락
이슈 변경 이력 추적이 필요했다. 별도 감사 로그 시스템을 구축할지, 간단한 Activity 모델로 할지 결정.

### 결정
Activity 모델을 추가하고, Issue PATCH/POST/Comment POST 시 자동으로 Activity 레코드를 생성한다.

### 근거
- 간단한 구조: action, field, oldValue, newValue로 모든 변경 추적 가능
- 별도 이벤트 시스템 없이 API route 내에서 직접 기록
- 댓글과 활동을 시간순으로 합쳐서 "전체" 탭으로 표시 (GitHub Issues 스타일)

### 기록 대상
- 이슈 생성 (CREATED)
- 상태 변경 (STATUS_CHANGED)
- 우선순위 변경 (PRIORITY_CHANGED)
- 담당자 변경 (ASSIGNEE_CHANGED)
- 라벨 추가/제거 (LABEL_ADDED/LABEL_REMOVED)
- 댓글 작성 (COMMENT_ADDED)

---

## ADR-011: 저장된 필터 (SavedFilter)

**날짜**: 2026-04-13
**상태**: 채택

### 맥락
필터 상태가 Zustand 싱글톤으로 관리되어 프로젝트 이동 시에도 유지되고, 자주 사용하는 필터 조합을 반복 설정해야 하는 불편이 있었다.

### 결정
SavedFilter 모델을 추가하여 필터 조합을 DB에 저장하고 한 번에 적용할 수 있게 한다.

### 근거
- 필터 상태를 JSON 문자열로 저장 (유연한 구조)
- `isShared` 플래그로 팀원 공유 지원
- 삭제는 만든 사람 또는 ADMIN만 가능

### 주의사항
- `filters` 필드가 JSON 문자열이므로 적용 시 `JSON.parse` 필수 (버그 발견 후 수정)
- API에서 반환 시에도 문자열 그대로 → 클라이언트에서 파싱

---

## ADR-012: E2E 테스트 전략 (Playwright)

**날짜**: 2026-04-12
**상태**: 채택

### 맥락
테스트 전략을 결정해야 했다. 단위 테스트, 통합 테스트, E2E 테스트 중 우선순위 설정.

### 결정
Playwright E2E 테스트를 우선 도입한다. 단위 테스트는 추후.

### 근거
- 소규모 프로젝트에서 E2E가 가장 높은 투자 대비 안정성 제공
- 전체 사용자 플로우 (로그인 → 대시보드 → 이슈 생성 → 칸반 보드) 검증
- httpOnly 쿠키 인증은 `page.request.post()`로 API 직접 호출하여 해결
- Page Object Model 패턴으로 유지보수성 확보

### 설정
- `workers: 1` (SQLite 동시 쓰기 불가)
- `fullyParallel: false` (테스트 순서 보장)
- `trace: "on-first-retry"`, `screenshot: "only-on-failure"`
- 현재 21개 테스트 (인증 3, 대시보드 2, 네비게이션 2, 리치에디터 4, 활동로그 4, 저장필터 6)
