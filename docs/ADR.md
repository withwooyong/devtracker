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

---

## ADR-013: Phase 2-1 스프린트(Sprint) 도메인 추가

**날짜**: 2026-04-20
**상태**: 채택

### 맥락
기간 기반 작업 단위 관리 요구가 생겼다. 이슈를 스프린트에 묶고, 번다운 차트로 진행 상황을 가시화할 필요가 있었다.

### 결정
`Sprint` 모델과 `Issue.sprintId` 외래키를 추가한다. Sprint 삭제 시 `onDelete: SetNull`로 이슈는 백로그로 보존. 번다운 차트는 별도 라이브러리 없이 SVG로 구현. DONE 전환 시점을 정확히 기록하기 위해 `Issue.completedAt` 필드를 추가.

### 근거
- `Sprint.status`: PLANNED → ACTIVE → COMPLETED 단순 선형 흐름
- 번다운 실제선을 `updatedAt`으로 계산하면 DONE 이후의 편집이 점을 밀어냄 → `completedAt` 필요
- recharts/chart.js 도입 대신 SVG 직접 그리기(의존성 제로, 100줄 내외)
- 이슈 PATCH에 `sprintId` 허용 시 해당 sprint가 같은 프로젝트에 속하는지 필수 검증(cross-project IDOR 방지)

### 결과
- 스프린트 탭(프로젝트별), 생성 폼, 상세 페이지(이슈 할당/시작/완료/번다운) 구현
- 이슈 DONE 전환 시 `completedAt = now`, DONE 해제 시 `completedAt = null`
- E2E 6개 시나리오 추가 (생성/유효성/상태 전환/삭제)

---

## ADR-014: Phase 2-2 인앱 알림 시스템

**날짜**: 2026-04-20
**상태**: 채택

### 맥락
이슈 변경/댓글/스프린트 이벤트를 관련자에게 실시간으로 알릴 필요가 있었다. 이메일/슬랙 같은 외부 채널은 Phase 3+로 미루고, 인앱 알림만 우선 구현.

### 결정
`Notification` 모델 (userId, type, title, message, link, isRead) + 30초 폴링 기반 드롭다운. 트리거는 각 API handler 내부에서 `createNotifications` 헬퍼로 발송. 전송 실패는 서버 로그로만 남기고 호출자(API 응답)에는 영향 주지 않는다.

### 근거
- WebSocket/SSE 도입은 과잉 — 팀 규모 5~20명에 30초 지연은 허용 범위
- 알림을 트랜잭션 외부에서 best-effort 처리 → 초기엔 단순성 우선 (후속으로 Outbox 패턴 도입, ADR-018 참조)
- 헬퍼에서 `link` 내부 경로(`/`) 검증으로 open redirect 사전 차단
- 드롭다운 클릭 → 읽음 처리 + 페이지 이동은 의도적 병렬(optimistic)

### 결과
- 트리거 5종: ISSUE_ASSIGNED, ISSUE_STATUS_CHANGED, ISSUE_COMMENTED, SPRINT_STARTED, SPRINT_COMPLETED
- `ids` 배열에 `.max(100)` 제한(DoS 방어)
- `Notification(userId, isRead, createdAt)` 복합 인덱스로 미읽음 카운트 쿼리 최적화
- 드롭다운 열 때 `invalidateQueries`로 즉시 재검증
- 후속(ADR-018): `createNotifications()`가 NotificationOutbox에 insert → inline/cron 드레인이 실제 Notification 생성. 유실 방지 + 재시도.

---

## ADR-015: Prisma 7 + Next.js 16 Turbopack + pnpm 호이스팅 회피

**날짜**: 2026-04-20
**상태**: 채택

### 맥락
Phase 2-1/2-2에서 스키마가 확장(Sprint, Notification, completedAt 추가)된 이후 Vercel 빌드가 `MODULE_NOT_FOUND: @prisma/client-runtime-utils`로 실패. 로컬 빌드는 성공. 동일 코드가 7일 전 배포에서는 정상 동작했었음.

### 결정
세 가지 설정을 모두 적용:
1. `.npmrc`의 `public-hoist-pattern[]=@prisma/*`로 Prisma 내부 패키지를 루트 `node_modules/@prisma/`에 호이스트
2. `next.config.ts`의 `serverExternalPackages`에 Prisma/libSQL 관련 6종 명시
3. `package.json` build 스크립트에 `--webpack` 플래그 (Next.js 16의 Turbopack 기본값 회피)

### 근거
- Prisma 7이 `prisma generate`로 생성하는 `.prisma/client/runtime/client.js`가 `require("@prisma/client-runtime-utils")`를 호출. 이 파일은 Prisma가 생성한 외부 디렉터리라 pnpm의 symlink 기반 resolution으로는 찾을 수 없음. 루트 호이스팅이 필요.
- Turbopack의 collect-page-data 단계에서 externalRequire가 해시된 Prisma 클라이언트(`@prisma/client-a883247f22e537ea`)의 의존성을 해석하지 못함. webpack은 같은 상황에서 일반 Node.js require로 fallback.
- `serverExternalPackages`는 번들에서 제외해 Node.js가 직접 require하게 하는데, 호이스팅이 안 되어 있으면 이 설정만으로는 부족.

### 결과
- Vercel 빌드 정상화, 프로덕션(https://devtracker-dusky.vercel.app) 재배포 성공
- dev 서버는 여전히 Turbopack 사용 (`pnpm dev`) — 빌드만 webpack
- 향후 Prisma 7 + Turbopack 공식 호환 패치가 나오면 `--webpack` 제거 검토

---

## ADR-016: Phase 3-1 파일 첨부 — Vercel Blob (Private + 프록시 다운로드)

**날짜**: 2026-04-20 (최초 Public 채택) → 2026-04-20 (Private 마이그레이션)
**상태**: 채택

### 맥락
이슈에 이미지/문서 첨부 기능이 필요했다. 파일 저장소 선택지는 Vercel Blob, Cloudflare R2, AWS S3, Supabase Storage 등이 있었다. 초기에는 구현 단순화를 위해 Public store로 시작했으나, 보안 리뷰에서 "URL 유출 시 영구 접근" 문제가 High로 지적되어 같은 세션에서 Private으로 전환.

### 결정
**Vercel Blob Private store + 서버 프록시 다운로드** 방식. 브라우저는 blob URL에 직접 접근할 수 없고, DevTracker API의 `/attachments/[id]/download` 엔드포인트를 경유해 인증 확인 후 blob stream을 받아 중계한다.

### 근거
- **저장소 선택**: Vercel 배포 환경이라 통합 부담 최소, 환경변수 1개(`BLOB_READ_WRITE_TOKEN`), 팀 규모 5~20명 기준 무료 티어(1GB) 충분
- **Private 전환 이유**: `access: "public"` URL은 인증 없이 영구 접근 가능. 퇴사자가 URL 기억 시 접근 통제 불가. Private + 프록시로 모든 다운로드가 로그인 세션을 거침.
- **프록시 다운로드 방식 선택**: Vercel Blob v2 SDK의 private 접근은 signed URL이 아니라 서버측 `get(url, { access: "private" })` (stream 반환). 브라우저 직접 접근 불가하므로 API 프록시가 유일한 방법.
- **성능 트레이드오프**: 모든 이미지/파일 다운로드가 Vercel 함수를 거쳐 대역폭 + 콜드 스타트 비용. 팀 도구 규모에선 허용 범위.
- **업로드 제약**: 4MB (Vercel 서버리스 body 제한), MIME prefix 화이트리스트, file-type magic byte 교차 검증, 이슈당 20개
- **Orphan blob 방지**: DB 삽입 실패 시 `del()` 롤백. DELETE 시 blob 삭제 실패는 best-effort 로그

### 결과
- `Attachment` 모델 + POST(multipart)/DELETE API + 드래그앤드롭 UI
- 신규 프록시: `GET /api/projects/[projectId]/issues/[issueId]/attachments/[attachmentId]/download` — 인증 후 `get()`으로 stream 중계, `Cache-Control: private, max-age=60`
- sanitize된 filename을 DB에 저장 (원본 보존이 아니라 안전성 우선)
- 초기 Public store 삭제 + Private store 재생성 (사용자 액션), Attachment 레코드 전체 삭제 (DB/Turso)
- E2E 7건: 업로드/크기 제한/MIME 거부/리스트 렌더/삭제 + 프록시 바이트 일치 검증 + 무인증 접근 401

---

## ADR-017: Phase 3-2 GitHub Webhook — 이슈 자동 연결

**날짜**: 2026-04-20
**상태**: 채택

### 맥락
PR과 이슈를 수동으로 연결하는 대신, GitHub PR 제목/브랜치명에 `DEV-123` 형태의 이슈 키가 포함되면 자동으로 연결되고 머지 시 이슈 상태를 DONE으로 전환하는 기능이 필요했다.

### 결정
**수신 전용 webhook**으로 시작한다. PR 이벤트만 구독하고, 커밋/브랜치 이벤트는 보류(Phase 4+). GitHub API 역방향 호출(예: 이슈 댓글에 PR 링크 자동 추가)은 범위 밖.

- 엔드포인트: `POST /api/webhooks/github`
- 서명 검증: `X-Hub-Signature-256` 헤더 + HMAC SHA-256 (timingSafeEqual로 타이밍 공격 방어)
- 구독 이벤트: `pull_request` (opened/edited/closed, merged 플래그 포함), `ping`
- 이슈 키 추출: `/\b([A-Z][A-Z0-9]+)-(\d+)\b/g` 패턴을 PR 제목과 `head.ref`에서 매칭
- PR 머지 시: 연결된 이슈 상태를 DONE + `completedAt` + `STATUS_CHANGED` Activity 로그 (reporter 명의)

### 근거
- **Webhook-only**: GitHub API 클라이언트 상태 관리(Rate limit, 토큰 갱신) 불필요, 단방향으로 단순
- **Pull requests만 구독**: push 이벤트는 WIP 커밋까지 포함해 노이즈가 크고, 브랜치명은 이미 PR의 `head.ref`에서 추출 가능
- **프로젝트 단위 설정 없이 전역 secret**: `GITHUB_WEBHOOK_SECRET` 환경변수 1개로 관리. 다중 레포/프로젝트 연결이 필요해지면 `ProjectSettings` 모델로 확장 (현재 범위 밖)
- **proxy.ts public path 추가**: webhook은 쿠키가 없는 호출이므로 `/api/webhooks`를 JWT 인증 우회 목록에 등록. 서명 검증만으로 신뢰성 확보
- **GitHubLink `(issueId, url)` unique**: 같은 PR이 여러 번 이벤트 발생해도 upsert로 최신 상태만 유지

### 결과
- `GitHubLink` 모델 (type/url/title/status/externalId) + webhook handler + 이슈 상세 GitHub 섹션 UI
- E2E 6건: 무인증 접근/서명 거부/ping/PR 생성/머지 시 DONE/매칭 실패
- 프로덕션 webhook 등록 + 서명 검증 + ping 200 응답 확인 완료 (GitHub repo → Settings → Webhooks)
- **알려진 한계**: 이슈 상태 변경 시 Activity의 `userId`가 reporter로 기록됨 (webhook은 사용자 컨텍스트 없음). 향후 GitHub 사용자 ↔ DevTracker 사용자 매핑 기능 추가 시 실제 작성자로 변경 가능

---

## ADR-018: 알림 Outbox 패턴 (인라인 드레인 + 일일 cron safety net)

**날짜**: 2026-04-20
**상태**: 채택

### 맥락
ADR-014에서 알림은 API 핸들러 내부에서 `prisma.notification.createMany()`로 직접 생성됐다. DB/네트워크 일시 장애 시 알림이 조용히 유실되고 재시도 수단이 없었다(best-effort). 보안/안정성 리뷰에서 유실 방지 + 재시도 메커니즘 요구가 있었다.

### 결정
**NotificationOutbox 테이블 + 인라인 드레인 + 일일 cron safety net** 조합.

1. `createNotifications()`가 NotificationOutbox에 insert (userId/type/title/message/link/attempts/lastError/scheduledFor)
2. Insert 직후 `drainInBackground()` 호출 — fire-and-forget으로 outbox에서 실제 Notification 행 생성 시도
3. Vercel Cron (`0 15 * * *`, 매일 KST 00:00)이 daily safety net으로 실행 — inline이 놓친/실패한 행 retry
4. 드레인 성공: outbox 삭제 + Notification 생성 (트랜잭션). 실패: attempts++, 지수 백오프(2^n초), 5회 소진 시 outbox에 남기고 로그만

### 근거
- **Vercel Hobby 플랜 cron 제약**: 분 단위 스케줄 불가(일일 1회만 허용). 분단위 설정(`* * * * *`)은 배포 에러 유발.
- **인라인 드레인 선택 이유**: 사실상 즉시 전달(fire-and-forget이지만 몇 ms 내 완료). 실사용자 지연 없음.
- **일일 cron 유지 이유**: 인라인 드레인도 실패 가능 (DB 일시 오류 등). 하루 1회라도 배치 재시도가 있으면 영구 유실은 막음.
- **로직 분리**: `src/lib/notification-drain.ts`에 `drainNotificationOutbox()` 헬퍼 추출 → HTTP 엔드포인트와 인라인 호출이 같은 코드 사용.
- **CRON_SECRET 검증**: timingSafeEqual, Bearer 헤더. 외부인이 드레인을 강제 호출해 재시도 횟수 소진 공격 차단.
- **proxy.ts 공개 경로**: `/api/cron`도 쿠키 없는 호출이라 JWT 인증 우회 목록에 등록 (ADR-017 webhook과 동일 패턴).

### 알려진 한계
- **진정한 트랜잭션 아토믹성은 미보장**: 본 요청 커밋 후 outbox insert가 실패하면 알림 유실 가능. 각 호출 지점을 `prisma.$transaction`으로 감싸는 후속 작업이 필요하지만 현 범위에서는 허용 수준으로 판단.
- **인라인 드레인의 promise는 응답과 독립 실행**: Next.js/Vercel에서 fire-and-forget이 함수 종료 시점에 잘릴 수 있음 (서버리스 특성). 일일 cron이 이런 케이스를 잡아줌.
- **일일 cron 지연**: inline이 완전 실패한 행은 최대 24시간 후 재시도. Hobby 플랜 제약상 허용.

### 결과
- `NotificationOutbox` 모델 + 인덱스 `(scheduledFor, attempts)`
- `src/lib/notification-drain.ts`: `drainNotificationOutbox()`, `drainInBackground()`
- `GET /api/cron/notifications/drain`: CRON_SECRET Bearer 검증 + 배치 100건 처리
- `vercel.json` cron `0 15 * * *`
- E2E 4건: 무인증/잘못된 Bearer/빈 배치/트리거→drain→배달 완료
- 프로덕션 배포 + Vercel Cron 자동 등록 + 401 차단 동작 확인
