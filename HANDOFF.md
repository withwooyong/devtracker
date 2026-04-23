# Session Handoff

> Last updated: 2026-04-23 (KST, /handoff 2부)
> Branch: `main`
> Latest commit: `58f3949` — feat: 댓글/답글 입력·렌더를 RichEditor로 통일
> Production: https://devtracker-dusky.vercel.app
> 최신 배포: 자동 트리거 `devtracker-fc40sjq4g` Ready (49s, `58f3949` 기준)

## Current Status

**✅ sonner 토스트 UI 전면 도입 + 댓글/답글 RichEditor 통일 완료.** 1부(`/handoff` 직후)에서 Vercel ↔ GitHub 자동 배포 재연동과 Cursor `GIT_ASKPASS` 영구 해결을 마친 다음, 같은 날 2부에서 토스트 인프라(`sonner@2.0.7`) → 에러 토스트 배선 → 위치 top-center 확정 → 성공 토스트 추가 → 댓글/답글을 RichEditor로 통일까지 일괄 진행. 6커밋 모두 `origin/main` 반영 + Vercel 자동 배포 반복 검증됨. **다음 후보는 B(접근성 전용 커밋)이며 범위가 커서 전용 세션을 권장**. 현 세션에서 PC 크래시 3회 있었던 점으로 로컬 Playwright/무거운 dev 작업은 계속 회피.

## Completed This Session (2026-04-23 2부)

| # | Task | Commit |
|---|------|--------|
| 1 | `pnpm add sonner@2.0.7` + `providers.tsx`에 `<Toaster position="bottom-right" richColors closeButton />` 마운트 | `e74dc68` |
| 2 | 5개 지점 mutation.onError에 `toast.error` 배선: 칸반 `boardMutation`(rollback + 토스트), 첨부 upload/delete onError + 4MB 초과, 사용자 프로필 저장, 프로젝트 설정 저장. 설정 페이지 `error` state + 인라인 빨간 배너 완전 제거 | `d5e1815` |
| 3 | `tests/e2e/toast.spec.ts` 3개 케이스 — Toaster 마운트 + 사용자/프로젝트 설정 저장 실패 토스트 표출. PC 크래시로 실제 실행 검증 보류, 코드만 커밋 | `0ecb150` |
| 4 | `Toaster` `position="bottom-right"` → `"top-center"` 변경 — 본문 컨텐츠 덜 가리는 일반 웹 알림 패턴 | `82e15ea` |
| 5 | 7개 지점 mutation.onSuccess에 `toast.success`: 이슈 생성, 편집 저장(per-call onSuccess — 인라인 드롭다운과 분리), 댓글 작성, 답글 작성(vars.parentId 분기), 첨부 업로드, 사용자/프로젝트 설정. 설정 페이지의 `successMsg` state + 녹색 배너 제거. `updateMutation`에 의도 주석 추가 | `2204a35` |
| 6 | 댓글/답글 입력 form `<textarea>` → `<RichEditor>`, 렌더 3곳 plain `<p>` → `<RichEditor editable={false}>`. `isHtmlEmpty()` helper로 `<p></p>` + `&nbsp;` 빈 제출 차단. 답글 토글 시 `replyContent` 리셋 | `58f3949` |

## Recent Commits

```
58f3949  feat: 댓글/답글 입력·렌더를 RichEditor로 통일
2204a35  feat: 핵심 mutation onSuccess에 성공 토스트 추가
82e15ea  chore: 토스트 위치를 상단 중앙(top-center)으로 변경
0ecb150  test(e2e): sonner 토스트 검증 스펙 추가
d5e1815  feat: 핵심 mutation onError를 sonner 토스트로 배선
e74dc68  feat: sonner 도입 + Providers에 Toaster 마운트
534a485  docs: /handoff 2026-04-23 — Vercel ↔ GitHub 재연동 + Cursor askpass 영구 해결
e6dec5c  chore: Vercel 자동 배포 재연동 검증
```

## Key Decisions

### 토스트 라이브러리: sonner 선택
- shadcn 친화 + Next.js 16/React 19 호환 + `richColors`/`closeButton` 기본 제공
- 번들 크기도 5KB 수준이라 경량
- 후보(react-hot-toast/자체 구현) 대비 기본값이 한국어 웹 UX와 자연스러움

### 토스트 위치: `top-center`
- 초기 `bottom-right`는 데스크톱 앱 UX의 관례지만 모바일에서 키보드/플로팅 액션과 겹칠 여지가 있음
- `top-center`는 본문을 덜 가리고 한국어 웹의 사용자 공지 패턴과 일관

### 인라인 성공/실패 배너 → 토스트로 일원화
- 설정 페이지의 녹색 `successMsg` + 빨간 `error` 배너는 **레이아웃 점프** 유발 + **재사용성 없음**
- 토스트는 portal 기반이라 레이아웃 독립 + 여러 mutation에서 동일 API로 재사용 가능
- `onError/onSuccess`는 mutation 레벨, but `updateMutation`처럼 인라인 드롭다운(상태/우선순위/담당자)에도 쓰이는 경우에는 **per-call onSuccess**로 저장 버튼에만 토스트를 붙여 스팸 방지

### 댓글/답글 RichEditor 통일 (ADR-028 연장)
- 이슈 설명과 동일 컴포넌트 재사용으로 **마크업 일관성** 확보 (볼드/이탈릭/목록/인용/코드 블록 공통)
- 기존 plain text 댓글은 Tiptap viewer의 schema 기반 자동 `<p>` 래핑으로 XSS 안전하게 렌더 (`dangerouslySetInnerHTML` 미사용)
- 빈 글 차단: Tiptap `getHTML()`가 빈 상태에서 `<p></p>`를 반환하므로 `!content.trim()`만으로는 부족 → `isHtmlEmpty()` helper로 태그 제거 + `&nbsp;` 치환 + trim 3단 검사
- 답글 `replyContent` state는 page-level 단일 상태라 서로 다른 답글 폼끼리 내용이 섞이는 UX 회귀가 있었음. 토글 onClick에서 `setReplyContent("")`로 해결

### e2e 검증 보류
- `pnpm dev` + Playwright 동시 기동이 세션 중 PC 크래시 3회 유발. 스펙은 코드로 보존하되 런타임 검증은 보류
- 안전한 대안: `pnpm build` 정적 검증 + push 후 Vercel 빌드 위임 + 프로덕션 URL 수동 확인

## Known Issues

### 이번 세션 신규 (deferred)

- **Tiptap viewer 인스턴스 churn**: 이슈 상세의 댓글 탭과 전체 탭이 각각 ALL 댓글에 대해 RichEditor 인스턴스를 마운트. 댓글 30개면 탭 전환 시 인스턴스 재생성 왕복. 퍼포먼스 관찰 대상, 현 팀 규모(5~20)에서는 무영향. 향후 infinite-scroll 도입 시 `React.memo` + 안정 key 또는 전용 `CommentViewer` 컴포넌트 분리 검토
- **`RichEditor` `autoFocus` prop 부재** — 답글 버튼 클릭 후 에디터로 자동 포커스 안 됨. RichEditor 공용 컴포넌트에 `autoFocus` prop 추가 + `useEditor` 마운트 시 `editor.commands.focus()` 호출하도록 확장 필요
- **`toast.spec.ts` 미실행** — 세션 내 PC 크래시로 Playwright 실행 보류. CI 또는 분리 환경에서 실행 필요
- **sonner 설치 + 토스트 마운트 후 런타임 검증은 Vercel 프로덕션 배포에만 의존** — 로컬 런타임 검증은 계속 회피 중

### 기존 이슈 (유지)

- **이슈 상세 편집 모드는 여전히 `<textarea>` 사용** — new 경로(RichEditor)와 불일치. HTML 원본 raw 편집
- **모바일 댓글 들여쓰기 `ml-10` 과다** — 좁은 화면에서 답글 영역 압박. `ml-6 md:ml-10` 조정 여지
- **다른 페이지 아바타 `UserAvatar` 미적용** — 사이드바/헤더/notification-dropdown 등 일괄 교체 여지
- **탭 터치 타겟 `py-2` 미적용** — 접근성 전용 커밋에서 일괄 처리 (B안)
- **ARIA tablist/radiogroup 완전 구현 미실시** — roving tabindex + 화살표 키 (B안)
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현**
- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안에서도 `useSortable` 실행. 현 규모 무영향
- **모바일 칸반 카드 순서 조정 미지원** (ADR-026 후속)
- **모바일 상태 select optimistic UI 없음** (데스크톱 DnD는 13-3차 해결)
- **`label.color` hex 무검증 `style` 인라인** / **`JSON.parse(f.filters)` try-catch 누락**
- **이슈 상세 `data!.issue.id` non-null** / **`commentMutation`의 `data?.issue?.id`**
- **commentMutation `onError` 없음** — 이번 세션에서 onSuccess 토스트만 추가. 실패 시 조용히 무시됨 (발견했으나 해당 커밋 스코프에서 제외). 다음 커밋 후보
- **deployments fetch `r.ok` 체크 누락** / **`environment` 타입 `string`** (`DeployEnvironment` 아님)
- **`window.confirm()` 사용** — iOS WKWebView 차단 가능 (B안)
- **BurndownChart 모바일 텍스트 가독성** — viewBox 축소 시 ≈6px (B안)
- **e2e 선택자 견고성** — `data-testid` 부여 권장
- **기존**: Outbox inline drain fire-and-forget, 첨부 Vercel 함수 경유, Prisma CLI `libsql://` 미지원, JWT role DB 미동기, 프로젝트 멤버십 미검증, 관리자용 사용자 매핑 화면 없음, push 이벤트 rate limit 없음
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 무관

## Pending Improvements

- [ ] **B. 접근성 전용 커밋 (전용 세션 권장)** — 탭 `py-2` + ARIA tablist roving tabindex + 팝오버 외부 클릭 + `window.confirm()` 교체(토스트 Provider 재활용) + BurndownChart 가독성
- [ ] **RichEditor `autoFocus` prop 확장** — 답글/인라인 에디터 UX
- [ ] **`commentMutation.onError` 토스트 추가** — 이번 세션 deferred
- [ ] **toast.spec.ts 실행 검증** — CI 혹은 분리 환경
- [ ] **이슈 상세 편집 모드 RichEditor 전환** — 현재 textarea로 HTML raw 편집
- [ ] **다른 페이지 아바타 `UserAvatar` 교체** — 사이드바/헤더/기타 페이지 확장
- [ ] **모바일 답글 들여쓰기 조정** (`ml-6 md:ml-10`)
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
- [ ] e2e `data-testid` 부여
- [x] ~~A. 성공 토스트 추가~~ (`2204a35`)
- [x] ~~C. 댓글/답글 RichEditor 적용~~ (`58f3949`)
- [x] ~~토스트 UI (sonner) 도입~~ (`e74dc68`, `d5e1815`, `82e15ea`)
- [x] ~~Vercel ↔ GitHub 자동 배포 재연동~~ (`e6dec5c`)
- [x] ~~GitHub 연동 스토리~~
- [x] ~~기술 부채 정리 묶음~~ (ADR-025)
- [x] ~~모바일 반응형 9 Phase~~ (ADR-026)
- [x] ~~칸반 드래그 500 진짜 수정~~ (`8a1cc2b`, ADR-027)
- [x] ~~칸반 보드 반응속도/비용 튜닝~~ (`e47d976`)
- [x] ~~칸반 같은 컬럼 내 카드 순서 변경~~ (`088e565`)
- [x] ~~이슈 설명 에디터 가독성 + 상세 HTML 렌더~~ (`ce3eaf4`)
- [x] ~~댓글 대댓글 1-depth 구조~~ (`60a2e40`, ADR-028)
- [x] ~~이슈 상세 아바타 구분 + 페이지 가독성~~ (`5dc4c98`)
- [x] ~~seed/테스트 안내 "Ted" 하드코딩 정리~~ (`21e764f`)

## Context for Next Session

- **사용자 원본 의도 (이번 세션)**: "토스트 UI 또는 접근성 커밋 우선순위" 합의 → A(성공 토스트) → C(댓글 RichEditor) → B(접근성) 순서 확정. A, C 완료, B는 다음 세션
- **다음 세션 최우선**: **B. 접근성 전용 커밋** — 범위가 크니 하위 묶음으로 나누는 편이 안전
  - 묶음 1: 탭 컴포넌트 `py-2` + roving tabindex + 화살표 키 + aria-selected
  - 묶음 2: 팝오버 외부 클릭 닫힘 (공용 `useClickOutside` 도입 후 일괄 적용)
  - 묶음 3: `window.confirm()` 교체 — sonner `toast.promise()` 또는 커스텀 confirm 컴포넌트 (이미 깔린 Toaster 재활용)
  - 묶음 4: BurndownChart 가독성 — viewBox 유지하면서 폰트 크기 최소값 확보
  - 각 묶음 별 커밋 분리 + 코드리뷰 → 충돌 영역 좁힘
- **환경 상태**:
  - `~/.claude/settings.json`의 `GIT_ASKPASS` 계열 env 빈 값 override 영구 적용됨. 새 Claude Code 세션에서 `echo $GIT_ASKPASS` 빈 문자열 확인됨. `git push`는 여전히 gh credential helper가 자동으로 안 붙길래 **일회성 우회** `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`로 진행. 영구 해결은 별도 조사 필요(원인: credential helper 체인 작동 메커니즘의 미묘한 부분 — 현시점 workaround로 충분히 동작)
  - **PC 크래시 3회 이력**: `pnpm dev` + Playwright 동시 기동이 부하. 검증은 `pnpm build`(정적) + push → Vercel 자동 배포 → 프로덕션 URL 수동 확인 조합으로 전환
- **사용자(허우용=Ted) 선호**: /ted-run 파이프라인. **push·프로덕션 배포는 명시 요청 시에만** (글로벌 CLAUDE.md). 커밋 메시지 한글. 비가역 작업(Turso 스키마 변경 등)은 사전 승인
- **푸시 상태**: 모든 커밋 `origin/main` 반영 완료 (`e6dec5c` ~ `58f3949`)
- **Co-Authored-By**: 프로젝트 `.claude/settings.local.json`에서 `includeCoAuthoredBy: true`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker` (Vercel 자동 배포 연결됨)
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123` (name: 허우용)
- 작업계획서: `docs/plan/mobile-responsive-plan.md`(9 Phase 완료)
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Private store
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 전역 fallback secret
- `CRON_SECRET` — Vercel Cron Bearer 인증

## Runbook

- **스키마 변경**: 1) Turso에 `ALTER TABLE ...` 수기 실행(FK 절은 SQLite ALTER 미지원, nullable 컬럼 + 인덱스 분리) 2) `schema.prisma` 수정 3) `npx prisma db push --url "file:./prisma/dev.db"` 4) `npx prisma generate`
- **Turso 쿼리**: `turso db shell devtracker "<SQL>"` (ADMIN은 homebrew `turso` CLI 로컬 설치)
- **로컬 env 동기화**: `vercel env pull .env.local --yes`
- **E2E 전체**: `pnpm dev &` 후 `npx playwright test` (양쪽 프로젝트 chromium + mobile-chrome) — ⚠️ PC 부담 주의, 크래시 이력 있음
- **E2E 모바일만**: `npx playwright test --project=mobile-chrome`
- **E2E 데스크톱 회귀**: `npx playwright test --project=chromium`
- **Vercel 자동 배포**: `git push origin main` — GitHub 연결됨. 수동 `vercel --prod --yes` 불필요
- **Vercel 수동 재배포** (자동 트리거 실패 시 fallback): `vercel --prod --yes`
- **Vercel 로그 조회 (과거)**: `vercel logs https://devtracker-dusky.vercel.app --no-follow --since=30m --status-code=500 --expand`
- **Vercel 로그 조회 (실시간 스트림)**: `vercel logs https://devtracker-dusky.vercel.app` (5분 후 자동 종료)
- **Vercel 배포 완료 폴링**: `until vercel ls devtracker 2>&1 | sed -n '4p' | grep -qE "Ready|Error"; do sleep 10; done && vercel ls devtracker | sed -n '1,5p'`
- **Webhook 이벤트 구독**: GitHub repo → Settings → Webhooks → `Pushes`, `Pull requests`
- **프로젝트 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리" `owner/repo`
- **프로젝트별 webhook secret**: 같은 페이지 "Webhook Secret" 16자 이상
- **본인 GitHub 계정 연결**: 사이드바 "내 프로필" → GitHub 로그인
- **커밋 메시지에 이슈 링크**: `DEV-123` 형식. push는 링크만, PR merge는 이슈 DONE
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Claude Code 개인 설정**: `.claude/settings.local.json`(gitignored)
- **Cursor 터미널 push 401 우회 (fallback)**: `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main` — 영구 해결은 `~/.claude/settings.json`의 `GIT_ASKPASS="".` env override로 되어 있으나, gh helper 자동 호출은 여전히 불안정하여 우회 명령이 안정적 경로
- **모바일 수동 확인**: iPhone SE 375×667 / Galaxy 360×780 / iPad 768 / 데스크톱 1440
- **토스트 검증 (수동)**: 프로덕션 `/login` → `/settings` → DevTools Network 탭에서 저장 요청 실패 유도(offline 체크) → 상단 중앙 빨간 토스트 확인

## Files Modified This Session (2부)

```
package.json                                       | +1  sonner@2.0.7
pnpm-lock.yaml                                     | +14
src/components/providers.tsx                       | +6  Toaster 마운트 + top-center
src/app/projects/[projectKey]/board/page.tsx       | +2  boardMutation.onError 토스트
src/components/common/attachment-list.tsx          | ±16 error state 제거 + 업로드/크기 초과 토스트
src/app/settings/page.tsx                          | ±24 successMsg/error 인라인 배너 제거, 토스트 일원화
src/app/projects/[projectKey]/settings/page.tsx    | ±24 동일 패턴
src/app/projects/[projectKey]/issues/new/page.tsx  | +2  createMutation 성공 토스트
src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx | ±93 commentMutation 성공 토스트 + updateMutation per-call + isHtmlEmpty + 답글 리셋 + RichEditor 교체
tests/e2e/toast.spec.ts                            | +80 (신규) Toaster + 설정 저장 실패 스펙
CHANGELOG.md                                       | +56 2부 섹션 prepend
HANDOFF.md                                         | (전면 개편)
```
