# Session Handoff

> Last updated: 2026-04-23 (KST, /handoff 3부)
> Branch: `main`
> Latest commit: `9bd97d0` — fix: 번다운 차트 모바일 가독성
> Production: https://devtracker-dusky.vercel.app
> 최신 배포: 자동 트리거 `devtracker-aafcee7kb` Ready (51s, `9bd97d0` 기준)

## Current Status

**✅ RichEditor 프로덕션 버그 핫픽스 + B안 묶음 4(번다운 차트 모바일 가독성) 완료.** 2부 완료 후 프로덕션에서 사용자가 "댓글 RichEditor의 H1/목록/인용 버튼이 시각적으로 동작 안 함"을 발견 → Tailwind v4 Preflight + `@tailwindcss/typography` 플러그인 부재가 원인으로 드러남 → `globals.css`에 `.ProseMirror` 한정 CSS 규칙 77줄 직접 정의로 해결(`61947a9`). 이어서 B안(접근성/가독성 커밋)의 묶음 4 번다운 차트 모바일 가독성(`9bd97d0`) 처리. 두 커밋 모두 origin 반영 + Vercel 자동 배포 Ready 확인됨. **다음 세션 최우선은 B안 묶음 2(팝오버 외부 클릭 닫힘)**.

## Completed This Session (2026-04-23 3부)

| # | Task | Commit |
|---|------|--------|
| 1 | 프로덕션 버그 진단: 댓글/답글 RichEditor에서 B/I/S만 시각적으로 작동하고 H1-3/`• 목록`/`1. 목록`/`<>`/`❝` 버튼은 무효. 원인은 Tiptap 커맨드가 아니라 **Tailwind v4 Preflight + `@tailwindcss/typography` 플러그인 부재**로 `prose`/`prose-sm` 클래스가 CSS를 주입하지 않던 것 | — |
| 2 | 해결 결정: 플러그인 설치 대신 `globals.css`에 `.ProseMirror` 영역 한정 CSS 규칙 직접 정의. 댓글 카드 좁은 영역의 `prose` 기본 여백 과함 + 추가 의존성 없이 scope 명확 + 이슈 설명과 댓글 양쪽에 동일 규칙 적용 | `61947a9` |
| 3 | `globals.css` +77줄: h1(1.5em)/h2(1.3em)/h3(1.1em) 크기·여백, ul disc + ol decimal + padding-left 1.5em, blockquote 왼쪽 3px 보더+이탤릭, pre/code 회색 배경+monospace, hr 1px | `61947a9` |
| 4 | B안 묶음 4 착수: `burndown-chart.tsx`에서 fontSize 10→18, SVG `max-w-[640px] mx-auto` 추가, viewBox height 220→240, padding.left 36→48(3자리 레이블 수용), padding.bottom 28→32 | `9bd97d0` |
| 5 | 두 커밋 모두 Vercel 자동 배포 Ready 확인 (`devtracker-p6j3egy21` 53s / `devtracker-aafcee7kb` 51s) | — |

## Recent Commits

```
9bd97d0  fix: 번다운 차트 모바일 가독성 (font 10→18, max-w 640px)
61947a9  fix: RichEditor 블록 스타일 복구 (h1/h2/h3/list/blockquote/pre/hr)
31e4d17  docs: /handoff 2026-04-23 2부 — sonner 토스트 + 댓글 RichEditor 통일
58f3949  feat: 댓글/답글 입력·렌더를 RichEditor로 통일
2204a35  feat: 핵심 mutation onSuccess에 성공 토스트 추가
82e15ea  chore: 토스트 위치를 상단 중앙(top-center)으로 변경
0ecb150  test(e2e): sonner 토스트 검증 스펙 추가
d5e1815  feat: 핵심 mutation onError를 sonner 토스트로 배선
e74dc68  feat: sonner 도입 + Providers에 Toaster 마운트
534a485  docs: /handoff 2026-04-23 — Vercel ↔ GitHub 재연동 + Cursor askpass 영구 해결
```

## Key Decisions

### RichEditor 블록 스타일 — `.ProseMirror` 직접 CSS (플러그인 대안 비채택)
- **Tailwind v4 Preflight이 의도 이상으로 공격적**: `<h1>`, `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<li>`, `<blockquote>` 기본 브라우저 스타일을 전부 리셋 (font-size inherit, list-style none 등)
- **`@tailwindcss/typography` 플러그인 설치는 비채택**: (a) 플러그인의 `prose` 기본 여백(`p` 위아래 1.25em)이 댓글 카드 좁은 영역에 과함, (b) `prose-p:my-1 prose-h1:text-base` 등 override modifier가 많아지면 디자인 분산, (c) 추가 의존성 관리 부담
- **채택: `.ProseMirror` 선택자 한정 CSS 77줄** — 이슈 설명 + 댓글 + 답글 뷰어/편집 4군데 동일하게 적용 (`RichEditor` 컴포넌트가 항상 `.ProseMirror` 클래스를 붙이기 때문). 선택자 scope 명확해 전역 오염 없음
- **인라인 마크(B/I/S)는 영향 없었던 이유**: `<strong>`/`<em>`/`<s>`는 Preflight이 font-weight/font-style/text-decoration만 건드리지 않음. 그래서 버그 재현 시 "어떤 버튼은 되는데 어떤 건 안 된다"는 혼동 패턴이 생김

### BurndownChart 모바일 가독성 — fontSize 상향 + SVG `max-w-[640px]`
- SVG `viewBox` + `w-full h-auto` 조합은 선형 스케일이라 모바일 360px에서 텍스트가 5.6px까지 축소됨
- 대응 옵션:
  - JS ResizeObserver로 컨테이너 크기 측정 후 fontSize 동적 조정 → 복잡도 ↑
  - CSS media query로 SVG `font-size` 분기 → SVG text는 viewBox 단위 해석이라 기대대로 안 먹음
  - **채택: fontSize 상수 상향(10→18) + SVG max-width로 upper bound** → 간단하고 예측 가능
- 효과: 모바일 360px 10.1px / 데스크톱 640px 이상 18px 고정 (좁아지는 태블릿 구간은 선형)

### /handoff 분할 전략
- 같은 하루(2026-04-23) 안에 3부에 걸친 /handoff 실행. 자연 작업 구간마다 /handoff를 찍는 방식 유지 — PC 크래시 이력(3회) 고려한 방어 저장 + 다음 세션 진입 시 최신 맥락 보존

## Known Issues

### 이번 세션 신규 (참고용 — 대부분 해소됨)

- **`@tailwindcss/typography` 플러그인 부재** — 의도적. RichEditor 블록 스타일이 `globals.css`의 `.ProseMirror` 규칙에 의존. 향후 다른 `prose` 사용처가 생기면 plugin 설치 재검토 필요
- **BurndownChart 와이드 데스크톱(2000px+)에서 차트가 640px에 캡** — `mx-auto`로 중앙 정렬되나 빈 좌우 여백이 눈에 띌 수 있음. 현 프로젝트 레이아웃(max-w-6xl 1152px)에서는 무영향

### 기존 이슈 (유지)

- **Tiptap viewer 인스턴스 churn** (2부에서 기록) — 댓글 30개 탭 전환 시 인스턴스 재생성. 5~20명 팀 무영향
- **`RichEditor` `autoFocus` prop 부재** (2부) — 답글 버튼 클릭 후 자동 포커스 안 됨
- **`toast.spec.ts` 미실행** (2부) — CI 또는 분리 환경에서 실행 필요
- **이슈 상세 편집 모드는 여전히 `<textarea>` 사용** — new 경로(RichEditor)와 불일치. HTML 원본 raw 편집
- **모바일 댓글 들여쓰기 `ml-10` 과다** — 좁은 화면에서 답글 영역 압박. `ml-6 md:ml-10` 조정 여지
- **다른 페이지 아바타 `UserAvatar` 미적용** — 사이드바/헤더/notification-dropdown 등 일괄 교체 여지
- **탭 터치 타겟 `py-2` 미적용** — B안 묶음 1에서 일괄 처리 예정
- **ARIA tablist/radiogroup 완전 구현 미실시** — roving tabindex + 화살표 키 (B안 묶음 1)
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현** — B안 묶음 2 (다음 세션 우선)
- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안에서도 `useSortable` 실행. 현 규모 무영향
- **모바일 칸반 카드 순서 조정 미지원** (ADR-026 후속)
- **모바일 상태 select optimistic UI 없음** (데스크톱 DnD는 13-3차 해결)
- **`label.color` hex 무검증 `style` 인라인** / **`JSON.parse(f.filters)` try-catch 누락**
- **이슈 상세 `data!.issue.id` non-null** / **`commentMutation`의 `data?.issue?.id`**
- **`commentMutation.onError` 없음** — 2부에서 onSuccess 토스트만 추가. 실패 시 조용히 무시됨
- **deployments fetch `r.ok` 체크 누락** / **`environment` 타입 `string`** (`DeployEnvironment` 아님)
- **`window.confirm()` 사용** — iOS WKWebView 차단 가능 (B안 묶음 3)
- **BurndownChart의 `new Date(startDate)` 타임존 불일치** — UTC 파싱 + 로컬 `getMonth/getDate`로 formatShort. UTC+9 환경에서 경계 케이스 가능
- **DONE 상태이나 `completedAt` null일 때 `updatedAt` fallback** — 완료일보다 이전/이후일 수 있음
- **e2e 선택자 견고성** — `data-testid` 부여 권장
- **기존**: Outbox inline drain fire-and-forget, 첨부 Vercel 함수 경유, Prisma CLI `libsql://` 미지원, JWT role DB 미동기, 프로젝트 멤버십 미검증, 관리자용 사용자 매핑 화면 없음, push 이벤트 rate limit 없음
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 무관

## Pending Improvements

### B안 (접근성/가독성 커밋) 진행 상황

- [x] ~~묶음 4. BurndownChart 모바일 가독성~~ (`9bd97d0`)
- [ ] **묶음 2. 팝오버 외부 클릭 닫힘** — 다음 세션 최우선. `useClickOutside` 훅 신설 + 저장된 필터 팝오버에 적용. 범위 작음, 리스크 낮음
- [ ] **묶음 1. ARIA 탭 + roving tabindex** — `ProjectTabs` 공통 + 이슈 상세 탭. `role="tablist"`, `aria-selected`, `tabIndex` 관리, 키보드 ← → 화살표 이동. 범위 중간, 공통 컴포넌트 수정이라 전용 세션 권장
- [ ] **묶음 3. `window.confirm()` 교체** — 다이얼로그 컴포넌트(Radix Dialog 또는 커스텀) 신설 + 이슈/프로젝트/스프린트/댓글 삭제 플로우 일괄 교체. 범위 큼, iOS WKWebView 차단 해소. 전용 세션 권장

### 그 외

- [ ] **RichEditor `autoFocus` prop 확장** — 답글/인라인 에디터 UX
- [ ] **`commentMutation.onError` 토스트 추가** — 2부 deferred
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
- [ ] BurndownChart 타임존 불일치 (`startDate` UTC vs `today` 로컬)
- [ ] e2e `data-testid` 부여
- [x] ~~RichEditor 블록 스타일 복구 (Tailwind v4 Preflight 대응)~~ (`61947a9`)
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

- **사용자 원본 의도 (이번 세션 3부)**: 2부 배포 직후 프로덕션에서 RichEditor 블록 스타일 깨짐을 스크린샷으로 제보. 핫픽스 후 B안 4개 하위 묶음 중 **묶음 4(BurndownChart)부터 /ted-run으로 처리**하기로 합의하고 실행. 모두 완료 후 /handoff로 3부 마감
- **다음 세션 최우선: B안 묶음 2 (팝오버 외부 클릭 닫힘)**
  - 범위: (a) 공용 `useClickOutside(ref, onOutside)` 훅 신설 — `useEffect`에서 document mousedown 리스너 등록, ref 외부 클릭 시 콜백 (b) 저장된 필터 팝오버에 적용 (필터 바에서 사용)
  - 난이도 낮음, 리스크 낮음, 1커밋으로 충분
  - 향후 다른 팝오버(드롭다운 메뉴 등)에도 재사용 가능
  - 예상 파일: `src/hooks/useClickOutside.ts` 신설 + 필터 팝오버 사용처 수정
- **이어 묶음 1(ARIA 탭) 또는 묶음 3(confirm 교체)**: 각각 전용 세션 권장
- **RichEditor 블록 스타일 교훈**: Tailwind v4 + Typography 플러그인 관계를 다음 세션이 바로 기억해야 함 — `prose` 클래스 보이면 "플러그인 필요 혹은 직접 CSS 정의 중 하나"라고 체크. 본 프로젝트는 **직접 CSS 정의** 방식 선택(globals.css `.ProseMirror` 블록)
- **환경 상태**:
  - `~/.claude/settings.json`의 `GIT_ASKPASS` 빈 값 override는 계속 적용됨. 이 세션에서도 새 세션 시작 시 `echo $GIT_ASKPASS`가 빈 문자열로 확인됨
  - gh credential helper 자동 호출은 여전히 불안정 → `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main` 우회가 안정적 경로. **매번 이 형태로 push 중**
  - **PC 크래시 3회 이력**: `pnpm dev` + Playwright 동시 기동 회피 지속. 검증은 `pnpm build` 정적 + Vercel 원격 빌드 + 프로덕션 URL 수동 확인 조합
- **사용자(허우용=Ted) 선호**: /ted-run 파이프라인. **push·프로덕션 배포는 명시 요청 시에만** (글로벌 CLAUDE.md). 커밋 메시지 한글. 비가역 작업(Turso 스키마 변경 등)은 사전 승인
- **푸시 상태**: 모든 커밋 `origin/main` 반영 완료 (`9bd97d0`까지)
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
- **E2E 전체**: `pnpm dev &` 후 `npx playwright test` (양쪽 프로젝트 chromium + mobile-chrome) — ⚠️ PC 부담 주의, 크래시 3회 이력
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
- **Cursor 터미널 push (고정 패턴)**: `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main` — gh helper 자동 호출이 환경에서 간헐적으로 실패해 이 우회 명령이 항상 안정적
- **모바일 수동 확인**: iPhone SE 375×667 / Galaxy 360×780 / iPad 768 / 데스크톱 1440
- **RichEditor 블록 스타일 디버깅**: `prose`/`prose-sm` 클래스가 보이면 먼저 `@tailwindcss/typography` 플러그인 설치 여부 확인. 현 프로젝트는 미설치 + `globals.css`의 `.ProseMirror` 규칙으로 대체
- **토스트 검증 (수동)**: 프로덕션 `/login` → `/settings` → DevTools Network 탭에서 저장 요청 실패 유도(offline 체크) → 상단 중앙 빨간 토스트 확인
- **번다운 차트 가독성 기준**: 모바일 360px에서 fontSize 18 × 0.5625 ≈ 10.1px 달성. 이보다 작은 화면은 현재 대응 범위 외

## Files Modified This Session (3부)

```
src/app/globals.css                          | +77  .ProseMirror 블록 스타일 규칙 (h1-3/list/blockquote/pre/code/hr)
src/components/common/burndown-chart.tsx     | ±21  fontSize 10→18, max-w 640px, padding 조정
CHANGELOG.md                                 | +43  3부 섹션 prepend
HANDOFF.md                                   | (전면 개편)
```
