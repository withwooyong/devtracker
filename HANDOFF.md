# Session Handoff

> Last updated: 2026-04-22 (KST, 13-5차 — 에디터 가독성 + 상세 HTML 렌더)
> Branch: `main`
> Latest commit: 금회 커밋 — fix: 이슈 설명 에디터 가독성 + 상세 뷰 RichEditor 재사용
> Production: https://devtracker-dusky.vercel.app
> 최신 배포: 금회 재배포 예정 (직전: `dpl_5SSEDHy4hjbbRgmfzNCk6jDt1FWa`)

## Current Status

**✅ 칸반 보드 드래그 500 해결 + 반응속도/비용 튜닝 + 같은 컬럼 순서 변경 수정 완료**. 13-2차에서 남긴 로깅 패치(`dcfdf33`)로 `vercel logs`에서 원인 포착 → Prisma `$transaction([...N update])`이 libSQL(Turso) RTT 누적으로 **5초 인터랙티브 트랜잭션 타임아웃(P2028)** 초과. `prisma.$executeRaw` + `CASE WHEN` 단일 UPDATE(`8a1cc2b`)로 1 RTT로 압축. 13-3차에서 optimistic UI + `r.ok` 체크 + `prefetch={false}`로 반응속도/비용 튜닝(`e47d976`). 13-4차(금회)에서 같은 컬럼 내 카드 순서 변경이 작동 안 하던 이슈 수정 — `KanbanColumn`에 `useSortable({ disabled: true })`를 잘못 사용한 것을 `useDroppable`로 교체하고, `handleDragEnd`의 splice 두 번 꼬임을 `@dnd-kit/sortable`의 `arrayMove` 유틸로 단순화. 제자리 드래그 early return도 추가.

## Completed This Session (2026-04-22, 13-5차)

| # | Task | 커밋 |
|---|------|------|
| 1 | 사용자 제보 3건: (a) 이슈 생성 화면 설명 에디터 폰트 흐려 가독성 나쁨, (b) 이슈 상세에 HTML 태그가 그대로 노출, (c) 댓글 구조를 대댓글 구조로 개선 — (a)/(b)만 금회, (c)는 스펙 논의 후 별도 | — |
| 2 | `rich-editor.tsx` — `EditorContent`에 `text-gray-900` + ProseMirror 내부 요소별 색상 명시(prose 기본 중간 회색 override). 가독성 개선 | 금회 |
| 3 | `rich-editor.tsx` — `onChange?` optional로 완화, `editable=false`일 때 border/focus-ring/padding 제거하여 순수 뷰어 모드로 동작하게 함 | 금회 |
| 4 | `issues/[issueNumber]/page.tsx` — description 렌더를 `<pre-wrap>`에서 `<RichEditor content editable={false} />`로 교체. Tiptap schema 기반 렌더라 XSS 안전(`dangerouslySetInnerHTML` 미사용) | 금회 |
| 5 | HANDOFF.md 업데이트, 커밋·푸시·재배포 | 금회 |

### 직전 세션 (13-4차)

| # | Task | 커밋 |
|---|------|------|
| 1 | 같은 컬럼 내 카드 순서 변경 불가 수정. `KanbanColumn` `useSortable({disabled:true})` → `useDroppable`로 교체 + `handleDragEnd`를 `arrayMove`로 재작성 | `088e565` |

### 직전 세션 (13-3차)

| # | Task | 커밋 |
|---|------|------|
| 1 | `vercel logs ... --status-code=500 --expand`로 실제 스택 확보. 원인: `Transaction API error: A rollback cannot be executed on an expired transaction. timeout 5000ms, timeTaken 5201~5952ms` (Prisma P2028) | — |
| 2 | `board/route.ts` — `$transaction([...update])` 배치 → `prisma.$executeRaw` + `CASE WHEN` 단일 UPDATE. `Prisma.sql`/`Prisma.join` 파라미터 바인딩으로 SQL injection 안전. `updatedAt` 명시 세팅 | `8a1cc2b` |
| 3 | `board/page.tsx` `boardMutation` — optimistic update + onError 롤백 + onSettled invalidate. `mutationFn`에 `res.ok` 체크 + throw | `e47d976` |
| 4 | `IssueCard` + 보드 카드 `<Link>` 3곳에 `prefetch={false}` | `e47d976` |

### 직전 세션 (13-2차, 같은 날)

| # | Task | 커밋 |
|---|------|------|
| 1 | 프로덕션 Vercel 자동 배포가 트리거 안 된 상황을 `vercel ls`로 확인 → `vercel --prod --yes`로 수동 재배포 | — |
| 2 | 칸반 드래그 상태 이동 실패, "클라이언트 OK, 서버 500" 확정 | — |
| 3 | `board/route.ts` catch 블록에 `console.error("[board PATCH]", error)` 로깅 | `dcfdf33` |

### 직전 세션 (13차, 같은 날)

| Phase | 커밋 | 내용 |
|-------|------|------|
| 1~2 | `f45dc57` | viewport + useUIStore/useMediaQuery + 사이드바 드로어화 |
| 3 | `b4277b2` | ProjectTabs 공통화 |
| 4 | `d858091` | 이슈 목록 카드 뷰 + 필터 바 세로 스택 |
| 5 | `aa0dae7` | 이슈 상세 1열 전환 |
| 6 | `1909ff7` | 칸반 보드 DnD 대신 상태 pill + 카드 select (ADR-026) |
| 7-a | `5dcdd0f` | 배포/스프린트/설정 정돈 + h1 suffix 제거 |
| 7-b | `3371ca6` | 스프린트 상세 + burndown |
| 8 | `644f22c` | 로그인/프로젝트 목록/에러 페이지 |
| 9 | `7ed3bdf` | Playwright 모바일 프로젝트 + 스모크 스펙 4종 |
| /handoff | `955a696` | 모바일 반응형 9 Phase CHANGELOG/HANDOFF + e2e 가이드 73개 |

## Recent Commits

```
금회     fix: 이슈 설명 에디터 가독성 + 상세 뷰 RichEditor 재사용
088e565  fix: 칸반 같은 컬럼 내 순서 변경 동작 (useDroppable + arrayMove)
e47d976  fix: 칸반 보드 반응속도/비용 튜닝 (optimistic UI + r.ok + prefetch=false)
8a1cc2b  fix: 칸반 보드 PATCH Prisma 트랜잭션 타임아웃 해소 (Raw SQL CASE WHEN)
dcfdf33  debug: board PATCH catch 블록에 console.error 추가
955a696  /handoff: 모바일 반응형 9 Phase CHANGELOG/HANDOFF + e2e 가이드 73개
7ed3bdf  모바일 반응형 Phase 9: Playwright 모바일 프로젝트 + 스모크 스펙 4종
644f22c  모바일 반응형 Phase 8: 로그인/프로젝트 목록/에러 페이지 정돈
3371ca6  모바일 반응형 Phase 7-b: 스프린트 상세 + burndown 차트 반응형
5dcdd0f  모바일 반응형 Phase 7-a: 배포/스프린트/설정 정돈 + h1 suffix 일괄 제거
1909ff7  모바일 반응형 Phase 6: 칸반 보드 DnD 대신 상태 pill + 카드 select
aa0dae7  모바일 반응형 Phase 5: 이슈 상세 페이지 1열 전환
```

## Key Decisions

### 모바일 반응형 9 Phase (완료, 13차)
- **CSS 분기 > JS 분기** (ADR-026): `useMediaQuery`로 조건부 렌더 대신 `md:hidden` / `hidden md:block` 두 블록 공존. SSR 플래시·DnDContext 재마운트·테스트 안정성 모두 해결
- **모바일 칸반 = 상태 변경, DnD ≠ 본질**: 드래그는 데스크톱 표현 방식. 모바일은 `<select>` + `handleMobileStatusChange`로 기존 `boardMutation` 재사용
- **ARIA 선언만 ≠ 동작 완성**: role+aria-selected를 붙였다가 roving tabindex + 화살표 키 핸들러 없이는 AT에 혼란 → 제거 (Phase 5·6 일관)
- **h1은 프로젝트 이름만, 페이지는 탭이 식별** (Phase 7-a)

### 칸반 드래그 500 해결 + 성능 튜닝 (완료, 13-3차)
- **로깅 우선**: 추정 수정 대신 `console.error` 1줄 패치(13-2차)로 실제 스택부터 확보 → 원인 확정 후 진짜 수정. 삽질 방지 → libSQL RTT 누적/P2028 확정
- **Raw SQL CASE WHEN 단일 UPDATE**: libSQL은 배치 트랜잭션에서 update를 직렬화해 RTT가 누적됨. `$transaction([...])` 대신 `$executeRaw`로 1 RTT. Prisma.sql/Prisma.join 파라미터 바인딩으로 SQL injection 안전
- **raw SQL은 `@updatedAt` 훅 우회**: 수동으로 `updatedAt = now` 세팅 필요. 전송된 모든 row에 동일 타임스탬프 → 순서만 영향, 기능엔 안전
- **Optimistic UI > 서버 왕복 대기**: React Query `onMutate` + `setQueryData` + `onError` 롤백 + `onSettled` invalidate. 체감 속도 즉시 개선
- **Link 자동 prefetch는 dense list에서 과잉**: 칸반 카드 N개 = Vercel λ N번 호출. `prefetch={false}`로 클릭 시 navigate로 전환. 첫 클릭 1-2초 로딩은 허용
- **`fetch(...).then`만으론 HTTP 에러를 surface 못함**: `r.ok` 체크 + `throw`가 있어야 React Query `onError`가 발동
- **Vercel 자동 배포 미트리거** 대응: `vercel --prod --yes` 수동 배포가 표준 우회로. runbook에 기재됨

## Known Issues

### 기존 이슈 (유지)

- **이슈 상세 편집 모드는 여전히 `<textarea>` 사용** — new 경로(RichEditor)와 불일치. HTML 원본을 raw로 편집하는 상태. 상세 편집도 RichEditor로 전환 필요 (13-5차 후속)
- **이슈 댓글 대댓글 구조 미구현** — Comment 스키마에 `parentId` 없음. Turso 마이그레이션 + API + 재귀 렌더 UI + 알림 확장 필요 (13-5차 후속, 스펙 논의 대기)
- **탭 터치 타겟 `py-2` 미적용** — 접근성 전용 커밋에서 일괄 처리
- **ARIA tablist/radiogroup 완전 구현 미실시** — roving tabindex + 화살표 키
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현**
- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안에서도 `useSortable` 실행. 현재 규모 무영향
- **모바일 칸반 카드 순서 조정 미지원** (ADR-026 후속)
- **`boardMutation.onError` 토스트 UI 없음** — 13-3차에 `r.ok` 체크로 에러는 surface되지만 실제 토스트/인라인 메시지는 아직 미구현
- **상태 select optimistic UI 없음** (모바일 `<select>` 경로. 데스크톱 DnD는 13-3차에 적용됨)
- **`label.color` hex 무검증 `style` 인라인** / **`JSON.parse(f.filters)` try-catch 누락**
- **이슈 상세 `data!.issue.id` non-null** / **`commentMutation`의 `data?.issue?.id`** → `issue.id` 직접 사용 권장
- **deployments fetch `r.ok` 체크 누락** / **`environment` 타입 `string`** (`DeployEnvironment` 아님)
- **`window.confirm()` 사용** — iOS WKWebView 차단 가능
- **BurndownChart 모바일 텍스트 가독성** — viewBox 축소 시 ≈6px
- **e2e 선택자 견고성** — `data-testid` 부여 권장
- **기존**: Outbox inline drain fire-and-forget, 첨부 Vercel 함수 경유, Prisma CLI `libsql://` 미지원, JWT role DB 미동기, 프로젝트 멤버십 미검증, 관리자용 사용자 매핑 화면 없음, push 이벤트 rate limit 없음
- **Vercel ↔ GitHub 자동 배포 미트리거**: 이번 세션에서도 `git push`만으로 배포 안 되어 `vercel --prod --yes` 수동 실행. 연동 상태 점검 필요 (Vercel 대시보드 → Settings → Git)
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 무관

## Pending Improvements

- [ ] **이슈 댓글 대댓글 구조** — Comment.parentId 스키마 + Turso 마이그 + API + 재귀 UI + 알림. 스펙 결정 필요(depth 제한, UI 들여쓰기, 알림 대상)
- [ ] **이슈 상세 편집 모드 RichEditor 전환** — 현재 textarea로 HTML raw 편집됨
- [ ] **Vercel ↔ GitHub 자동 배포 재연동** — 매번 수동 배포는 지속 불가능
- [ ] **접근성 전용 커밋 (누적)** — 탭 터치 타겟 `py-2` + ARIA tablist 완전 + 팝오버 외부 클릭
- [ ] **`boardMutation` 에러 토스트 UI** — `r.ok` 체크로 surface는 됐으나 사용자 피드백 UI 미구현
- [ ] Rate limiting (알림/첨부/webhook) — Upstash Redis
- [ ] Slack/Discord 외부 알림 통합 — Outbox 확장
- [ ] 설정 페이지 2차 — name 편집, 삭제 영역 분리, 관리자용 사용자 매핑 화면
- [ ] Webhook secret 로테이션 감사 로그
- [ ] Orphan blob cleanup 배치
- [ ] push 이벤트 rate limit
- [ ] `handlePush` 이슈 조회 N+1 개선
- [ ] `GITHUB_LINK_TYPE_VALUES`/`_STATUS_VALUES` export
- [ ] 이슈 상세 `data!` non-null 제거, `commentMutation` `issue.id` 직접 사용
- [ ] deployments fetch `r.ok` + `environment` 타입 `DeployEnvironment`
- [ ] `window.confirm()` 인라인 확인 UI 교체
- [ ] BurndownChart 모바일 텍스트 가독성
- [ ] 칸반 모바일 카드 순서 조정 (↑↓ or long-press)
- [ ] 모바일 상태 select optimistic UI + 토스트 피드백 (데스크톱 DnD는 13-3차 해결)
- [ ] e2e `data-testid` 부여
- [x] ~~GitHub 연동 스토리~~
- [x] ~~기술 부채 정리 묶음~~ (ADR-025)
- [x] ~~모바일 반응형 9 Phase~~ (ADR-026)
- [x] ~~칸반 드래그 500 진짜 수정~~ (13-3차, `8a1cc2b`: `$executeRaw` CASE WHEN)
- [x] ~~칸반 보드 반응속도/비용 튜닝~~ (13-3차, `e47d976`: optimistic UI + r.ok + prefetch=false)
- [x] ~~칸반 같은 컬럼 내 카드 순서 변경~~ (13-4차, `088e565`: useDroppable + arrayMove)
- [x] ~~이슈 설명 에디터 가독성 + 상세 HTML 렌더~~ (13-5차, 금회: text-gray-900 + RichEditor 뷰어 모드)

## Context for Next Session

- **다음 세션 후보**: (a) 접근성 전용 커밋 / (b) Vercel ↔ GitHub 자동 배포 재연동 / (c) `boardMutation` 에러 토스트 UI / (d) Rate limiting / (e) Slack 외부 알림 / (f) 설정 페이지 2차
- 사용자(Ted) 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드 → HANDOFF/커밋). 푸시·프로덕션 배포는 명시 요청 시. 커밋 메시지 한글
- **푸시 상태**: 금회 커밋까지 `origin/main` 반영 완료
- **Co-Authored-By**: 프로젝트 `.claude/settings.local.json`에서 `includeCoAuthoredBy: true`
- Production URL: https://devtracker-dusky.vercel.app
- 최신 배포: 금회 재배포 (직전: `dpl_5SSEDHy4hjbbRgmfzNCk6jDt1FWa`)
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker`
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- 작업계획서: `docs/plan/mobile-responsive-plan.md`(9 Phase 완료)
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Private store
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 전역 fallback secret
- `CRON_SECRET` — Vercel Cron Bearer 인증

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`
- **로컬 env 동기화**: `vercel env pull .env.local --yes`
- **E2E 전체**: `pnpm dev &` 후 `npx playwright test` (양쪽 프로젝트 chromium + mobile-chrome)
- **E2E 모바일만**: `npx playwright test --project=mobile-chrome`
- **E2E 데스크톱 회귀**: `npx playwright test --project=chromium`
- **Vercel 수동 재배포** (자동 트리거 실패 시): `vercel --prod --yes`
- **Vercel 로그 조회 (과거)**: `vercel logs https://devtracker-dusky.vercel.app --no-follow --since=30m --status-code=500 --expand`
- **Vercel 로그 조회 (실시간 스트림)**: `vercel logs https://devtracker-dusky.vercel.app` (5분 후 자동 종료)
- **Webhook 이벤트 구독**: GitHub repo → Settings → Webhooks → `Pushes`, `Pull requests`
- **프로젝트 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리" `owner/repo`
- **프로젝트별 webhook secret**: 같은 페이지 "Webhook Secret" 16자 이상
- **본인 GitHub 계정 연결**: 사이드바 "내 프로필" → GitHub 로그인
- **커밋 메시지에 이슈 링크**: `DEV-123` 형식. push는 링크만, PR merge는 이슈 DONE
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Claude Code 개인 설정**: `.claude/settings.local.json`(gitignored)
- **모바일 수동 확인**: iPhone SE 375×667 / Galaxy 360×780 / iPad 768 / 데스크톱 1440
