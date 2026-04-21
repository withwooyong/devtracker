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
- **인라인 드레인의 promise는 응답과 독립 실행**: Next.js/Vercel에서 fire-and-forget이 함수 종료 시점에 잘릴 수 있음 (서버리스 특성). 일일 cron이 이런 케이스를 잡아줌.
- **일일 cron 지연**: inline이 완전 실패한 행은 최대 24시간 후 재시도. Hobby 플랜 제약상 허용.

### 결과
- `NotificationOutbox` 모델 + 인덱스 `(scheduledFor, attempts)`
- `src/lib/notification-drain.ts`: `drainNotificationOutbox()`, `drainInBackground()`
- `GET /api/cron/notifications/drain`: CRON_SECRET Bearer 검증 + 배치 100건 처리
- `vercel.json` cron `0 15 * * *`
- E2E 4건: 무인증/잘못된 Bearer/빈 배치/트리거→drain→배달 완료
- 프로덕션 배포 + Vercel Cron 자동 등록 + 401 차단 동작 확인

### 보강 — 2026-04-20 (아토믹성 강화)
초기 결정 시 "본 요청과 outbox insert의 아토믹성 미보장"을 허용 한계로 두었으나, 본 요청 커밋 후 outbox insert 실패 시 유실/본 요청 롤백 시 유령 알림이 남는 문제를 근본 해결하기 위해 API 전용 Transactional Outbox로 승격.

- `src/lib/notification.ts`: `createNotification`/`createNotifications` 제거, `enqueueNotificationsTx(tx, inputs)`와 `triggerNotificationDrain()` 신설. outbox insert는 호출자의 트랜잭션 안에서만 수행되도록 타입 강제.
- 3개 트리거 경로를 `prisma.$transaction(async (tx) => …)`로 묶음: 이슈 PATCH(`issue.update` + `activity.createMany` + 알림), 댓글 POST(`comment.create` + `activity.create` + 알림), 스프린트 PATCH(`sprint.update` + 알림).
- `triggerNotificationDrain()`은 트랜잭션 커밋 성공 후에만 호출하여 인라인 드레인이 커밋된 행을 보도록 보장. 트랜잭션이 롤백되면 outbox 행도 함께 사라짐.
- 스프린트 PATCH의 경우 대상 assignee 조회는 read이므로 트랜잭션 밖에서 수행해 write-only tx를 유지 (libSQL 단일 라이터 lock 경쟁 최소화).
- 드레인 호출은 실제 알림 insert가 있었던 경우로 한정(`hasNotifications`, `recipients.length > 0`). 불필요한 outbox 스캔 제거.

---

## ADR-019: 프로젝트 설정 페이지 + 권한 가드 (1차 스코프)

**날짜**: 2026-04-21
**상태**: 채택

### 맥락
ADR-017에서 GitHub webhook은 전역 `GITHUB_WEBHOOK_SECRET` 하나와 PR 제목의 이슈 키(`DEV-123`)로 프로젝트를 매핑했다. 여러 레포가 같은 DevTracker 인스턴스를 쓰게 되면 프로젝트별 레포 연결 정보가 필요하다. 또한 프로젝트 생성자(createdBy)가 본인 프로젝트의 메타(설명) 정도는 직접 편집할 수 있어야 한다.

### 결정
1차 스코프는 "프로젝트 메타 편집"만. 다음으로 범위를 자른다.

1. `Project.githubRepo String?` (`"owner/repo"` 형식) 필드 추가. 1차에선 값만 저장, webhook 라우팅 교체는 후속.
2. `PATCH /api/projects/[projectId]`: 권한을 `role === "ADMIN"` → `role === "ADMIN" || createdById === user.userId`로 확장. 401(미인증)/403(권한 부족)/404(없음) 분리.
3. `updateSchema`에 `description`(max 2000, nullable), `githubRepo`(빈 문자열 또는 `^(?!.*\.\.)[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$`) 추가. 빈 문자열은 서버에서 `null`로 정규화.
4. `/projects/[projectKey]/settings` 클라이언트 페이지: 기존 탭 네비게이션에 "설정" 추가(항상 노출). 권한 없는 사용자에게는 읽기 전용 안내 문구만 렌더.
5. 폼 컴포넌트를 분리하고 `key={project.id}`로 mount 제어 → `useEffect` 안의 `setState` 패턴(react-hooks/set-state-in-effect) 회피.

### 근거
- **소규모 스코프**: 멀티 레포 webhook 라우팅·사용자 매핑·권한 레벨 정교화는 별 ADR로 분리. 1차에서 UI와 데이터 모델만 선행.
- **createdBy 편집 허용**: ADMIN-only로 두면 프로젝트를 만든 담당자가 본인 프로젝트 설명도 못 바꾸는 역설이 생긴다.
- **zod regex의 `..` 명시적 차단**: DB 저장 문자열이라 경로 traversal 위험은 없지만 의도 명확화.
- **탭 링크를 항상 노출**: 권한 확인을 위해 각 탭 페이지에서 project·user를 전부 조회하는 비용을 피함. 서버 가드가 진실의 소스, UI는 힌트.
- **프로젝트 존재 여부 탐색 가능성**: 404/403 분리로 인증된 아웃사이더가 임의 `projectId`로 존재 여부를 탐색 가능하지만, 본 프로젝트는 "모든 인증 사용자가 모든 프로젝트 접근"을 의도적으로 허용(Known Issues)해 이미 GET으로도 노출 중. 새 정보 노출 없음.

### 결과
- `prisma/schema.prisma` `Project.githubRepo String?` 추가, Turso `ALTER TABLE Project ADD COLUMN githubRepo TEXT` 적용
- `src/types/project.ts`에 `githubRepo?: string | null`
- `src/app/api/projects/[projectId]/route.ts` PATCH 권한/스키마 확장
- `src/app/projects/[projectKey]/settings/page.tsx` 신규 (폼 컴포넌트 분리)
- 4개 탭 페이지에 "설정" 링크 추가
- `tests/e2e/project-settings.spec.ts` Journey 12 × 5건 (탭 노출, 폼 로드, 정상 저장, 형식 오류, 미인증 401)

### 남겨둔 후속
- webhook 라우팅을 `Project.githubRepo` 기반으로 전환 (현재는 전역 secret + PR 제목 이슈 키로 매핑)
- GitHub 사용자 ↔ DevTracker 사용자 매핑
- ADMIN-only 항목(프로젝트 삭제, 키 변경) 별도 섹션
- 프로젝트 멤버십 개념 도입 시 탭 노출도 권한 기반으로 전환

---

## ADR-020: GitHub webhook 하이브리드 라우팅 (`githubRepo` 우선, 키-prefix 폴백)

**날짜**: 2026-04-21
**상태**: 채택

### 맥락
ADR-017에서 webhook은 전역 `GITHUB_WEBHOOK_SECRET` 하나와 PR 제목의 이슈 키(`DEV-123`)로 프로젝트를 매핑했다. ADR-019에서 `Project.githubRepo` 필드를 추가했지만 1차에선 값만 저장하고 라우팅에는 미사용했다. 이번에 실제 라우팅을 해당 필드 기반으로 전환하되, 기존 사용자 경험을 깨지 않는 방식을 선택한다.

### 결정
**하이브리드 라우팅**: `payload.repository.full_name`이 어떤 `Project.githubRepo`와 매칭되면 "scoped" 모드로 그 프로젝트 이슈만 처리. 매칭이 없으면 "legacy" 모드(PR 제목의 이슈 키로 프로젝트를 찾는 기존 동작)로 폴백.

1. `scopedProject = prisma.project.findFirst({ where: { githubRepo: repoFullName } })` 1회 조회
2. scoped 모드: `extractIssueKeys()` 결과 중 `key === scopedProject.key`인 항목만 처리. 나머지는 `skippedKeys` 응답 필드와 `console.info` 로그로 기록.
3. legacy 모드: 각 key마다 `prisma.project.findFirst({ where: { key } })`로 조회 (기존 동작과 동일)
4. 응답에 `mode: "scoped" | "legacy"` 필드 추가 (관측성)

### 근거
- **기존 사용자 경험 보존**: `githubRepo`를 설정하지 않은 프로젝트는 기존 동작 그대로 유지. 무중단 전환.
- **Opt-in 강한 경계**: `githubRepo`를 설정한 팀은 자동으로 "이 레포의 PR은 이 프로젝트만 건드린다"는 테넌시 경계를 얻음.
- **cross-project silent drop 관측성**: `skippedKeys`로 "왜 OPS-999 이슈가 닫히지 않았는지" 디버깅 가능. 프로덕션 문의를 차단.
- **DB 질의 효율**: scoped 모드에선 `findFirst`를 1번만 호출, legacy 모드와 동일한 쿼리 수 유지.
- **타입 정확성**: `PullRequestPayload.repository`를 optional로 변경(`?: { full_name: string }`). GitHub이 `repository`를 누락해도 null-safe하게 legacy로 폴백.

### 결과
- `src/app/api/webhooks/github/route.ts`: 라우팅 분기 + `skippedKeys`/`mode` 응답 + `console.info` 로그
- `tests/e2e/github-webhook.spec.ts` Journey 10b × 3건 추가:
  - scoped 매칭: DEV 레포→DEV 이슈 정상 처리
  - scoped 다른 키 무시: DEV 레포 PR에 OPS-999만 있으면 matched 0
  - scoped cross-project: DEV-N + OPS-999 혼합 PR에서 DEV-N만 처리
- `test.beforeAll/afterAll`에서 `playwright.request.newContext()`로 독립 세션을 열어 setup/restore의 쿠키 격리를 명시적으로 보장. 복원은 `expect(res.status()).toBe(200)` 검증 포함.

### 남겨둔 후속
- 프로젝트별 webhook secret (`Project.githubWebhookSecret`) — 현재는 여전히 전역 `GITHUB_WEBHOOK_SECRET` 하나
- GitHub 사용자 ↔ DevTracker 사용자 매핑 (PR 머지 Activity가 reporter 명의로 남는 문제)
- push 이벤트 지원 (커밋 ↔ 이슈 연결)

---

## ADR-021: 프로젝트별 GitHub webhook secret

**날짜**: 2026-04-21
**상태**: 채택

### 맥락
ADR-020에서 `Project.githubRepo` 기반 하이브리드 라우팅을 도입했지만, 서명 검증은 여전히 전역 `GITHUB_WEBHOOK_SECRET` 하나로 수행했다. 팀이 늘고 외부 협력사 레포가 추가되면 **하나의 secret이 유출될 때 모든 프로젝트의 webhook이 동시에 뚫리는** 블라스트 반경 문제가 있다. 프로젝트별 secret을 도입하되, 기존 사용 경험을 깨지 않도록 한다.

### 결정
1. **스키마**: `Project.githubWebhookSecret String?` 추가. `null`이면 전역 secret을 사용하는 기존 동작, 값이 있으면 해당 프로젝트 webhook에만 이 secret으로 서명을 재검증.
2. **라우팅 순서 재설계** (`src/app/api/webhooks/github/route.ts`):
   - (a) rawBody를 best-effort로 JSON 파싱해 `repository.full_name`만 추출 (검증 전 입력이므로 DB 질의 외 부작용 없음)
   - (b) `Project.findFirst({ githubRepo })`로 scoped 프로젝트 조회 (단 1회)
   - (c) secret 선택: `scopedProject?.githubWebhookSecret ?? process.env.GITHUB_WEBHOOK_SECRET`
   - (d) 그 secret으로 HMAC 검증 → 실패 시 401, 성공 시에만 ping/pull_request 분기로 진입
3. **API 응답에서 secret 원문 격리**: `GET /api/projects/[projectId]`, `PATCH` 둘 다 `select`로 필드를 명시하고 응답은 `githubWebhookSecretSet: boolean`으로만 노출. 서버 → 클라이언트로 평문이 흐르지 않음.
4. **관측성**: webhook 응답에 `secretSource: "project" | "global"` 필드 추가. 운영 로그/테스트에서 어느 secret이 사용됐는지 즉시 확인 가능.

### 근거
- **블라스트 반경 축소**: 한 프로젝트 secret 유출이 다른 프로젝트로 전파되지 않음. 로테이션 단위도 프로젝트.
- **무중단 전환**: secret 미설정 프로젝트는 전역 secret으로 그대로 동작.
- **검증 전 DB 조회의 안전성**: 검증 전에 수행하는 작업은 "JSON.parse + 단일 findFirst(repo 완전일치)"뿐이며, 검증 실패 시 즉시 401. 쿼리 증폭/DoS 벡터 없음.
- **평문 반환 금지**: webhook secret은 사실상 자격증명이므로 한 번 저장 후 클라이언트에 다시 흐르지 않도록 설계 — 저장 후 "재설정"하려면 새 값을 타이핑해야 하며, "제거"는 별도 버튼으로 분리.
- **zod 길이 제한**: 16~256자 규칙으로 오타/너무 짧은 secret을 프론트/서버 양쪽에서 차단. 빈 문자열은 `null`로 정규화.

### 결과
- `prisma/schema.prisma`: `Project.githubWebhookSecret String?` 필드 추가. 로컬 SQLite + Turso 모두 `ALTER TABLE`로 적용.
- `src/app/api/webhooks/github/route.ts`: 파싱 → scoped 조회 → secret 선택 → 서명 검증 순서로 재작성. `secretSource` 응답 필드 추가.
- `src/app/api/projects/[projectId]/route.ts`: `GET`/`PATCH` 모두 `select`로 필드 고정, 응답에서 `githubWebhookSecret` 원문 제거하고 `githubWebhookSecretSet` 플래그로 대체. `updateSchema`에 `githubWebhookSecret`(16~256자 또는 빈 문자열→`null`) 추가.
- `src/app/projects/[projectKey]/settings/page.tsx`: "Webhook Secret" 섹션 신설 — password 입력 + **설정됨/미설정** 뱃지 + "제거"/"제거 취소" 액션. 저장 성공 후 입력값/액션 초기화.
- `src/types/project.ts`: `githubWebhookSecretSet?: boolean` 필드 추가.
- E2E Journey 10c × 3건:
  - GET 응답이 secret 원문을 포함하지 않고 `githubWebhookSecretSet=true`만 노출
  - 프로젝트 secret으로 서명된 요청 통과 + `secretSource=project`
  - 프로젝트 secret 설정 상태에서 전역 secret으로 서명된 요청 401

### 대안
- **배달 헤더(`x-github-delivery`) 기반 사전 매핑**: GitHub 자체는 repo 단위로 delivery ID만 고유하게 할당할 뿐, 프로젝트 힌트를 주지 않음. 결국 repo 이름을 body에서 읽어야 하므로 추가 이득 없음 → 기각.
- **전역 secret만 사용, 프로젝트 secret은 저장 후 추가 검증**: 두 번 검증하는 비용 + 운영 혼란 → 기각.
- **secret을 암호화 저장**: Turso DB 접근 자체를 관리자로 제한하는 현 보안 모델에선 과잉. 향후 테넌시 강화 시 재검토.

### 남겨둔 후속
- secret 로테이션 UI/감사 로그 (누가 언제 변경했는지)
- 전역 secret 역시 프로젝트별 secret처럼 UI에서 관리하도록 통합(옵션)
- GitHub 사용자 ↔ DevTracker 사용자 매핑 (PR 머지 Activity가 reporter 명의)

---

## ADR-022: GitHub 사용자 ↔ DevTracker 사용자 매핑

**날짜**: 2026-04-21
**상태**: 채택

### 맥락
ADR-017 도입 이후 PR 머지로 인한 이슈 상태 변경(STATUS_CHANGED Activity)은 실제 PR 작성자와 무관하게 **이슈 reporter 명의**로 기록됐다. 기록이 실제 행위자와 달라 활동 로그·알림의 신뢰도가 떨어졌고, 누가 어떤 이슈를 실제로 마무리했는지 추적이 불가능했다. OAuth 없이 self-service로 식별자를 연결할 방법이 필요했다.

### 결정
**User 모델에 GitHub 식별자를 추가**하고, webhook 처리 중 PR 작성자를 DevTracker user로 매핑한다. OAuth는 도입하지 않고, 사용자가 본인 프로필 페이지에서 GitHub 로그인을 수동 등록한다.

1. **스키마**: `User.githubLogin String? @unique`, `User.githubId Int? @unique` 추가.
2. **매핑 규칙** (`resolvePullRequestAuthor`):
   - (a) `githubId` 완전 일치로 우선 조회
   - (b) 없으면 `githubLogin` 완전 일치로 조회
   - (c) login 매칭 성공 시 해당 user의 `githubId`를 PR payload 값으로 **항상 최신화** (로그인 변경 내성 + 다음 번엔 id 경로로 즉시 매칭)
   - (d) 어느 경로로도 매칭 실패 시 `null` 반환 → `Activity.userId`는 `issue.reporterId`로 폴백
3. **API**: `PATCH /api/auth/me` 신설 — 본인 `githubLogin`(GitHub 로그인 정규식 검증) / `name` 셀프 업데이트. 중복은 insert 전 `findUnique` 선검사로 409 응답(libSQL 어댑터 경유 P2002 코드가 환경 의존적인 문제 회피).
4. **관측성**: webhook 응답에 `prAuthorMatched: boolean` 필드 추가.
5. **UI**: `/settings` 사용자 프로필 페이지 신설(`src/app/settings/page.tsx`). 사이드바 사용자 블록에 "내 프로필" 링크.

### 근거
- **OAuth 없이 시작**: 5~20명 팀 도구로 OAuth 서버 운영 부담은 과잉. self-service 문자열 입력이면 충분.
- **`githubId` 자동 백필**: login은 사용자가 임의 변경 가능(깃허브 프로필 username 변경). 숫자 `id`는 불변 — 한 번 매칭되면 login 변경에도 매칭이 유지됨.
- **`githubId`를 매번 덮어쓰는 이유**: 매핑 규칙의 idempotency 보장. 과거 스테일 값이 남아있던 테스트·운영 시나리오에서도 최신 payload가 진실이 되도록 강제. 드문 경우 unique 충돌 시 `console.warn`으로 노출하고 이번 요청은 login 매칭 결과로 응답(사용자 측 수동 정리 유도).
- **409 선검사**: Prisma P2002는 어댑터/버전에 따라 error shape이 달라 catch 기반 감지는 취약. 기존 `projects/route.ts`/`auth/register/route.ts`와 동일하게 pre-insert 확인 패턴을 따름.
- **폴백 투명성**: 매핑 실패를 숨기지 않고 `prAuthorMatched: false`로 응답에 명시 → 운영·테스트에서 "왜 이 PR이 내 이름으로 안 찍혔지"를 즉시 확인 가능.
- **보안**: 자기 프로필만 수정(`payload.userId == updated.id`). 타인 프로필 수정 경로 없음. Admin UI는 후속.

### 결과
- `prisma/schema.prisma`: `User.githubLogin`, `User.githubId` unique nullable 필드 추가. 로컬 SQLite + Turso ALTER + unique index 생성.
- `src/app/api/auth/me/route.ts`: `GET` 응답에 `githubLogin` 포함 + `PATCH` 엔드포인트 신설(정규식/길이 검증 + 409 선검사).
- `src/app/api/webhooks/github/route.ts`:
  - `PullRequestPayload.pull_request.user?: { login, id }` 추가
  - `resolvePullRequestAuthor()` 함수 추가
  - `Activity.userId`를 `prAuthor?.id ?? issue.reporterId`로 변경
  - 응답 payload에 `prAuthorMatched` 필드 추가
- `src/app/settings/page.tsx`: 사용자 프로필 페이지 신설(이메일·이름 read-only + GitHub 로그인 편집 + 저장 후 쿼리 무효화).
- `src/components/layout/sidebar.tsx`: "내 프로필" 링크 추가(현재 경로 강조 스타일 포함).
- `src/types/user.ts`: `githubLogin?: string | null` 필드 추가.
- E2E Journey 13 × 6건 추가 (PATCH 라운드트립, 중복 409, 형식 400, 매칭 명의 Activity, reporter 폴백, login 매칭 시 `githubId` 자동 저장 후 id 단독 매칭).

### 대안
- **OAuth 연동**: 사용자 경험은 좋지만 시크릿 관리·콜백 엔드포인트·세션 머지 비용이 크다. self-service로 우선 충분.
- **이메일 도메인 휴리스틱**: GitHub 이메일이 프로필 공개 여부에 좌우되고, 팀 이메일(`@yanadoocorp.com`)과 GitHub noreply가 달라 현실성 낮음.
- **관리자 일괄 매핑 UI**: 초기엔 본인이 직접 등록하는 편이 정확. 후속 개선 후보.

### 남겨둔 후속
- GitHub push 이벤트 지원 시 commit 저자 매핑(동일 규칙 재사용 가능)
- 관리자용 매핑 관리 화면(admin이 다른 사용자의 githubLogin 조회/수정/해제)
- 매핑 변경 감사 로그
- GitHub OAuth로 자동 매핑 전환(원할 경우)

---

## ADR-023: GitHub push 이벤트 지원 (커밋 ↔ 이슈 링크)

**날짜**: 2026-04-21
**상태**: 채택

### 맥락
ADR-017/020/021/022까지는 **pull_request** 이벤트만 처리했다. 하지만 팀은 초안 PR 이전 단계에서도 커밋 메시지에 이슈 키(`DEV-42`)를 붙여 push하는 관행이 있어, 머지 이전의 작업 이력을 이슈에서 바로 볼 수 있게 하자는 요구가 누적됐다. push 이벤트는 PR 없이도 들어오므로 기존 라우팅·서명·매핑을 그대로 재사용하면서도 **이슈 상태는 건드리지 않는** 링크 전용 경로가 필요했다.

### 결정
**push 이벤트 전용 분기를 webhook 라우트에 추가**하고, 커밋마다 `GitHubLink(type="COMMIT")`를 `(issueId, url)` 기준 upsert한다. 이슈 상태 변경과 Activity 기록은 PR Merge의 고유 영역으로 남기고, push는 링크만 생성한다.

1. **라우팅 리팩터**: 기존 단일 POST 핸들러에서 PR 로직을 `handlePullRequest()`로 추출하고, 새로 `handlePush()`를 추가. 공통 프로젝트 조회는 `resolveProjectForKey()`(scoped/legacy 통합)로 분리.
2. **분기 조건**:
   - `payload.deleted === true` → `skipped: "deleted"`와 `matched: 0, commits: 0` 응답, 즉시 종료 (브랜치 삭제/force push 대응)
   - `commits.length === 0` → `matched: 0` 응답 (빈 push 조용히 통과)
3. **매핑 로직**:
   - 모든 commits의 이슈 키를 한 번 모아 **project는 1회 `findMany({ key: { in: uniqueKeys } })`** 로 조회 → legacy 모드 N+1 제거
   - scoped 모드는 매핑된 프로젝트 키만 허용, 그 외 키는 `skippedKeys`(Set으로 중복 제거)에 축적
   - 이슈는 `(projectId, issueNumber)` 유니크로 개별 조회(실존 여부 확인 필요)
4. **GitHubLink 필드**:
   - `type: "COMMIT"`, `status: null` (커밋에는 자연스러운 상태가 없음), `externalId: commit.id` (40자 SHA)
   - `title`: 커밋 메시지 1줄 요약, 200자 제한. 빈 줄일 경우 SHA 앞 7자
   - 재전송·rebase로 인한 중복도 `(issueId, url)` 유니크로 안전
5. **응답 shape**: `{ ok, event: "push", matched, commits, mode, secretSource, skippedKeys? }`. `deleted` 조기 반환 경로도 동일 shape를 유지해 클라이언트·테스트가 혼란 없도록 `matched: 0, commits: 0`을 포함.

### 근거
- **상태 변경은 PR의 영역**: 커밋마다 이슈 상태를 바꾸면 활동 로그가 소음으로 가득 찬다. push는 "링크 기록"만 한다는 역할 분리가 활동 로그 신호 대 잡음 비를 유지.
- **Activity 생성 안 함**: 커밋 단위 Activity는 수십 개가 한 번에 생기고 매핑 실패 시 reporter 명의로 폴백되는 것도 부정확하다. 이벤트 로그는 GitHubLink 리스트 자체가 대신한다.
- **배치 project 조회로 N+1 제거**: push는 GitHub 기본 20 commits/delivery까지 올 수 있어 루프마다 `findFirst`는 확장성 문제가 됨. 고유 키 집합을 선수집해 `findMany({ in })` 1회로 전환. 이슈 조회는 `(projectId, issueNumber)` 단위 조회가 최소 쿼리 수(중복 제거 불가능)이므로 유지.
- **`skippedKeys` Set**: 다른 commit들이 같은 타 프로젝트 키를 반복 참조하면 배열에 중복 값이 누적되던 MEDIUM 이슈를 Set으로 해결. 응답·로그 모두 중복 없음.
- **`deleted: true` 응답 shape 통일**: 초기 설계는 조기 반환이라 필드 일부만 담았으나, 클라이언트/테스트 파서 관점에선 `matched`/`commits`를 항상 기대하는 게 단순. LOW 이슈로 지적되어 정리.
- **`resolvePullRequestAuthor` 재사용 보류**: push의 pusher/commit.author는 commit SHA당 다를 수 있고, Activity를 안 만들면 사실상 사용처가 없어 이번엔 연결하지 않음. 나중에 "커밋 작성자 별 활동 수" 같은 지표가 필요할 때 복원.

### 결과
- `src/app/api/webhooks/github/route.ts`:
  - PR 로직을 `handlePullRequest()`로 추출
  - `handlePush()` 추가 (배치 조회 · `skippedKeys` Set · `deleted` 응답 통일)
  - `resolveProjectForKey(key, scopedProject)` 공통 헬퍼 도입
  - `PushCommit`/`PushPayload` 타입 추가
  - 엔트리포인트는 `event === "ping" | "pull_request" | "push"` 분기, 그 외 `skipped`
- E2E Journey 14 × 5건: 이슈 키 포함 커밋 링크 생성, 동일 push 재전송 중복 미생성(`@@unique([issueId, url])`), 다중 commit 중 일부만 매핑, deleted push 스킵, 빈 commits 스킵.
- E2E Journey 14b × 1건: scoped 모드에서 매핑된 프로젝트 키의 commit만 링크되고 외부 키는 `skippedKeys`.
- 문서: `docs/user-guide.md` 10-2에 Push 행 추가, 10-3에 push 동작 주석 추가.

### 대안
- **Push에서도 이슈 상태 변경**: 커밋 메시지에 `Fixes DEV-42` 같은 키워드가 있을 때 DONE 전환. GitHub 기본 동작과 유사하지만 팀 워크플로 상 PR 승인이 공식 "완료" 시그널이라 일관성이 깨짐 → 기각.
- **배치 이슈 조회**: `findMany({ OR: [(projectId, issueNumber), ...] })`로 이슈도 1회. 실제 실행된 OR 서브쿼리가 복잡해 옵티마이저가 인덱스를 덜 쓸 우려가 있고, 대부분의 push는 고유 이슈 2~5개 수준이라 이득이 작음 → 현재 상태 유지.
- **Push에서도 `resolvePullRequestAuthor` 적용해 Activity 생성**: 소음 문제로 기각. 후속에 "지표"용으로 다시 열어볼 수 있음.

### 남겨둔 후속
- 같은 커밋 SHA가 **여러 브랜치에 나타날 때** URL이 동일(`/commit/<sha>`)이라 중복 링크 문제 없지만, 만약 GitHub이 URL에 브랜치 쿼리를 붙여 변조한다면 SHA 기반 유니크(`@@unique([issueId, externalId])`)로 강화 고려
- push 이벤트에 대한 rate limiting(대규모 monorepo에서 푸시 폭주 방어)
- 이슈 상세 UI에서 COMMIT 타입 링크의 시각적 구분(아이콘/배지)