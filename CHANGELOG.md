# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/).

## [2026-04-24] 청크 2 — 남은 페이지 shadcn 전환 완료 (2-a + 2-b + 2-c)

5부(청크 1)에 이어 남아 있던 9개 페이지를 3개 청크로 나누어 전부 shadcn 기반으로 전환. 이제 앱의 모든 페이지가 OKLCH 토큰 체계를 사용한다.

### Added
- **ui 컴포넌트 3종 추가** — `Popover`(`@radix-ui/react-popover` 1.1.15), `Table`, 그리고 Textarea는 5부에서 추가됐지만 이번 청크부터 본격 사용(배포 변경사항/스프린트 목표) — `79a3b50`
- **`SPRINT_STATUS_VARIANT` 매핑(2-c)** — `src/app/projects/[projectKey]/sprints/page.tsx` + `sprints/[sprintId]/page.tsx`에 모듈 스코프 `Record<SprintStatus, BadgeVariant>` 도입(PLANNED=slate, ACTIVE=blue, COMPLETED=emerald). 기존 하드코딩 `SPRINT_STATUS_COLORS`를 shadcn Badge variant 체계에 통합(types/sprint.ts의 상수 자체는 다른 곳 호출 대비 남겨둠) — `b9d8368`
- **filter create/delete mutation 토스트 배선** — 이전까지 `onError` 누락이었던 `createFilterMutation`/`deleteFilterMutation`에 sonner 토스트 추가. 성공 시 "필터를 저장했습니다" 토스트도 추가 — `79a3b50`
- **배포 생성 토스트** — `createMutation.onSuccess/onError`로 배포 기록 성공/실패 토스트 — `b9d8368`
- **deployments 쿼리 `r.ok` 체크** — 리팩토링 과정에서 원본의 `r.ok` 누락 발견 → 추가 — `b9d8368`

### Changed
- **대시보드(2-a, `dashboard/page.tsx`)** — 프로젝트 카드 그리드를 Card + `hover:-translate-y-0.5` 리프트, 키 박스는 `bg-primary/10 text-primary`. Skeleton 그리드 6개로 로딩 플레이스홀더. 빈 상태 Card + `Button asChild + Link`로 CTA — `79a3b50`
- **프로젝트 목록(2-a, `projects/page.tsx`)** — 새 프로젝트 폼 Card + Input + Label(htmlFor 연결) + Button. 리스트 Card hover, Skeleton 3개 로딩 — `79a3b50`
- **프로젝트 메인(2-a, `projects/[projectKey]/page.tsx`, 최대 변경)** — 필터 바 Card화. **저장된 필터 커스텀 드롭다운 → shadcn Popover**로 교체(Radix의 pointer-down 기반 outside-click 자동 처리로 **B안 묶음 2 자연 해소**). Select 3개(상태/우선순위/담당자) — `ALL` 값은 non-empty이므로 Radix 제약 OK. 검색은 Input. 데스크톱 이슈 리스트는 shadcn Table, 모바일은 Card 기반 IssueCard. 필터 JSON.parse try/catch + 형식 오류 토스트 — `79a3b50`
- **IssueCard(2-a, `components/issues/issue-card.tsx`)** — 전체 카드 Link 래핑 유지. Card + Badge(#prefix 표시) + group hover 색상 전환 — `79a3b50`
- **로그인(2-b, `login/page.tsx`)** — standalone 유지(`min-h-screen bg-muted/30`), Card + Separator + Input/Label/Button. 인라인 에러 `role="alert"` + `bg-destructive/10 border-destructive/30`. 로그인/회원가입 모드 토글 `Button variant="link"`. 테스트 계정 안내 `bg-muted/50` 박스 — `010f491`
- **전역 설정(2-b, `settings/page.tsx`)** — Card + Input + Label + Button. 이메일/이름 `disabled readOnly`(React controlled-input 경고 방지). 로딩 Skeleton 라인 4개. 취소 `Button asChild + Link /dashboard` — `010f491`
- **프로젝트 설정(2-b, `projects/[projectKey]/settings/page.tsx`)** — Card + Textarea(설명) + Input(repo) + Input password(secret). **webhook 상태 Badge**(variant=emerald/slate). 제거/제거 취소 `Button variant="link"` + `focus-visible:ring-offset-2`(ring 잘림 방지). 권한 없음 amber Card 패널(라이트/다크 대응). 로딩 Skeleton — `010f491`
- **배포 목록(2-c, `deployments/page.tsx`)** — 배포 카드 Card, 버전 `font-mono`. env 필터(ALL/DEV/STAGING/PROD)를 Button size="sm"(default/outline 토글)로. 변경사항 `<details>`는 유지하되 pre 배경 `bg-muted/50`로 토큰화. Skeleton 3개, 빈 상태 Card — `b9d8368`
- **배포 신규(2-c, `deployments/new/page.tsx`)** — Card + Input + Select(환경) + Textarea(Markdown 변경사항). Label htmlFor="deploy-env" ↔ SelectTrigger id 연결 — `b9d8368`
- **스프린트 목록(2-c, `sprints/page.tsx`)** — Card hover + Badge `rounded-full` pill. Skeleton 4개 그리드 — `b9d8368`
- **스프린트 신규(2-c, `sprints/new/page.tsx`)** — Card + Input + Textarea + 날짜 Input. 에러 `role="alert"` + destructive 토큰 — `b9d8368`
- **스프린트 상세(2-c, `sprints/[sprintId]/page.tsx`, 356줄)** — 메타 Card(이름 + Badge + 기간 + goal). 상태 전환 버튼(시작/완료/삭제) Button size="sm". 완료 버튼은 `bg-emerald-600 hover:bg-emerald-700` 인라인(variant 없음, 다크모드 대응은 후속). 진행률 바 `bg-muted`/`bg-primary` 토큰. BurndownChart 유지. 이슈/백로그 리스트 Card + Separator로 섹션 구분. 백로그 영역 `bg-muted/30`. "제거" Button variant="ghost" — `b9d8368`

### Fixed
- **webhook secret 제거 취소 silent drop 버그(2-b, `project-settings`)** — 사용자가 secret 입력 → "제거" 클릭 → "제거 취소" 클릭 시, `webhookSecret` state에 입력값이 남아 있지만 action은 `null`이 되어 저장 시 해당 값이 사라지던 문제. "제거 취소" 핸들러에서 `setWebhookSecret("")` 추가로 input과 state를 함께 비움 — `010f491`
- **JSON.parse 런타임 크래시 가능성(2-a, `projects/[projectKey]/page.tsx`)** — 저장된 필터 적용 시 `f.filters`가 서버에서 문자열로 올 경우를 대비한 `JSON.parse` 호출에 try/catch 없었음 → 형식 오류 시 토스트 + 조기 반환 — `79a3b50`

### a11y
- **비밀번호 placeholder(2-b)** — 로그인 페이지 `••••••`(스크린리더가 "bullet bullet..." 낭독) → "비밀번호 입력" — `010f491`
- **Select htmlFor(2-c)** — 배포 신규의 "환경" Label이 Select와 연결 안 돼 있던 문제 수정(Label htmlFor + SelectTrigger id) — `b9d8368`
- **Popover delete 버튼 stopPropagation(2-a)** — Radix는 pointerdown 기반이라 click의 `stopPropagation`이 무효 → 제거. 필터 삭제 후 Popover가 유지되는 동작은 여러 필터 정리에 편리해서 의도적으로 유지 — `79a3b50`

### 배포
- `79a3b50` 2-a → Vercel 자동 배포 트리거
- `010f491` 2-b → Vercel 자동 배포 트리거
- `b9d8368` 2-c → Vercel 자동 배포 트리거
- 세 커밋 모두 `origin/main` 반영 완료

### 남은 후속 (다음 세션)
- 다크모드 토글 UI(`next-themes` + 헤더 토글) — 토큰 준비 완료, UI만 남음
- AlertDialog로 `window.confirm()` 교체(스프린트 삭제 등)
- "스프린트 완료" 버튼 하드코딩 `bg-emerald-600` → success Button variant로
- `components/layout/*` · `components/common/*` 토큰 치환(영향도 낮음, 보류 가능)

---

## [2026-04-23] 5부 — shadcn/ui 도입 + 칸반 감성 효과 + 이슈 상세/생성 shadcn 전환

### Added
- **shadcn/ui 인프라 전면 도입** — Tailwind v4 공식 지원 스택(style: new-york, baseColor: slate). 의존성 추가: `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `@radix-ui/react-select`, `@radix-ui/react-avatar`, `@radix-ui/react-separator`, `lucide-react`(1.8.0), `tw-animate-css`. `src/lib/utils.ts`(cn), `components.json` 생성. `globals.css`를 OKLCH 토큰 체계로 전면 재작성(라이트/다크 양쪽, `@theme inline`으로 Tailwind 유틸리티 노출, 다크모드 variant `&:is(.dark *)`). 네이티브 input/textarea/select 기본 스타일은 `:not([data-slot])`로 shadcn 컴포넌트와 분리 — `3423468`
- **shadcn UI 컴포넌트 10종** — `src/components/ui/`: Button, Card, Badge(slate/blue/amber/emerald/orange/red/purple 커스텀 variants), Skeleton, Avatar, Separator, Select(Radix), Input, Textarea, Label — `3423468`, `6fda696`
- **칸반 보드 감성 효과 — ambient/tilt/magnetic/skeleton** — 컬럼별 OKLCH 커스텀 토큰(`--kanban-todo/progress/review/done` + glow)으로 radial + linear gradient mesh 배경. 드래그오버 시 `ambient-pulse` 애니메이션 + glow 링. 카드 hover 시 `perspective(900px)` + `rotateX/Y` 최대 5° 3D 틸트 + 자석 3px 변위 + 포인터 스포트라이트(`radial-gradient at var(--pointer-x)`). 로딩 상태는 스피너 → `skeleton-shimmer`(좌→우 하이라이트 keyframe) 보드 전체 플레이스홀더. `prefers-reduced-motion` 환경에서는 모든 모션 비활성 — `3423468`
- **`src/components/board/use-tilt.ts`** — 포인터 위치 → `--tilt-x/y`, `--mag-x/y`, `--pointer-x/y`, `--tilt-glow` CSS 변수 주입 훅. `requestAnimationFrame` 배칭. DnD 중엔 `active: false`로 비활성. `onPointerLeave`/`onPointerDown`에서 상태 리셋 — `3423468`

### Changed
- **`src/components/common/status-badge.tsx`** — 하드코딩된 Tailwind 색상 문자열 → shadcn `Badge` + variant 매핑 체계(TODO=slate, IN_PROGRESS=blue, IN_REVIEW=amber, DONE=emerald / LOW=slate, MEDIUM=blue, HIGH=orange, CRITICAL=red / 배포: SUCCESS=emerald, FAILED=red, ROLLED_BACK=amber / 환경: STAGING=purple, PROD=red). 외부 호출부 시그니처 유지 — `3423468`
- **칸반 보드(`board/page.tsx`)** — 데스크톱/모바일 모두 shadcn 컴포넌트로 교체. 데스크톱 카드는 Card + tilt-card 래퍼(drag 중엔 tilt 끔, DragOverlay에 `rotate-[1.5deg]` + 강한 그림자). 모바일은 네이티브 `<select>` → shadcn Select(컬럼 dot 아이콘), 상태 pill → Button outline/default. 컬럼 dot은 `ring-2 ring-background/80`로 ambient 배경과 대비 확보. 빈 컬럼에는 dashed border "비어 있음" 플레이스홀더 — `3423468`
- **이슈 생성 페이지(`issues/new/page.tsx`)** — 전체 폼 → `Card` + `CardHeader/CardTitle/CardContent`. `<input>`/`<select>`/`<textarea>` → `Input`/`Select`/`Textarea`, `<label>` → `Label` + `htmlFor` 연결. 버튼 → `Button` variant(ghost/default). 라벨 피커는 색상 값 직접 주입 필요로 커스텀 스타일 유지(토큰만 `border-input`/`text-muted-foreground`로 교체). Radix Select 빈값 제약 대응 → module scope 상수 `UNASSIGNED = "__unassigned__"` 센티넬로 "미지정" 처리, 상태→UI와 UI→API 양방향 변환 — `6fda696`
- **이슈 상세 페이지(`issues/[issueNumber]/page.tsx`)** — 모든 카드형 `<div className="bg-white p-4 rounded-lg border">` → `Card`/`CardContent`. 편집 모드 `Input`(제목) + `Textarea`(설명). 사이드바 `<select>` 3개(상태/우선순위/담당자) → shadcn `Select`, 메타 정보 구분선 `<div className="pt-2 border-t">` → `Separator`. 댓글/답글/전체 탭 모든 카드를 Card로, 답글은 `bg-muted/40`로 시각적 들여쓰기. 로딩 스피너 → Card + Skeleton 레이아웃 플레이스홀더. 탭 바는 언더라인 스타일 유지(토큰 `border-primary`/`text-foreground`로 전환). 담당자 Select도 동일한 `UNASSIGNED` 센티넬 적용 — `6fda696`
- **답글 작성 폼 구조 재배치** — 초안에서 `<Card asChild>`로 form을 Card로 변신시키려 했으나 현 Card 구현이 Radix `Slot`을 쓰지 않아 `asChild` 무효(TS 에러 + 런타임은 div로 남음). 코드 리뷰에서 CRITICAL로 걸러 `<form>`을 outer로, `<Card>`를 inner로 재배치(form 기능 + 카드 시각 모두 정상 동작) — `6fda696`

### 배포
- `3423468` shadcn 도입 + 칸반 감성 효과 → Vercel 자동 배포 트리거
- `6fda696` 이슈 상세/생성 shadcn 전환 → Vercel 자동 배포 트리거
- 둘 다 `origin/main` 반영 완료. push는 기록된 회피책(`git -c credential.helper='!gh auth git-credential'`) 사용

### 남은 shadcn 전환 후보 (다음 세션)
- 대시보드(`src/app/dashboard/page.tsx`), 프로젝트 목록(`src/app/projects/page.tsx`), 프로젝트 메인/설정, 배포/스프린트 관련 페이지, 전역 설정. 토큰 체계가 이미 구축되어 있어 교체는 주로 `bg-white/border-gray-*` → `bg-card/border-border` 치환 + Card/Button 래핑

---

## [2026-04-23] 4부 — 모바일 칸반 상태 select 피커 핫픽스

### Fixed
- **모바일 칸반 `MobileKanbanCard`의 상태 select 옵션 피커가 화면 좌상단에 미니 박스로 렌더되던 문제** — 사용자 스크린샷으로 발견. 원인: `text-xs`(12px) 적용으로 iOS Safari가 포커스 시 자동 줌인 트리거 → native 옵션 피커 위치/스케일이 뒤틀림(Android/DevTools 에뮬레이터에서도 유사 사례 알려짐). 해결: `text-xs` → `text-sm` + inline `style={{ fontSize: '16px' }}`(iOS 자동 줌 차단 기준선) + `py-1` → `py-1.5`(터치 타겟 확대). 셀렉트 버튼 가로/세로 크기는 수 px 증가 수준이라 카드 레이아웃 영향 미미 — `043855b`

### 배포
- `043855b` → `devtracker-end8fqkrj` Ready (50s). 프로덕션 URL 동일: https://devtracker-dusky.vercel.app

### 검증 요청
- 실제 스마트폰(iOS Safari / Android Chrome)에서 재현 여부 확인 필요. DevTools 에뮬레이터에서만 발생하는 현상이었다면 실기에서는 원래부터 정상일 가능성도 있음

---

## [2026-04-23] 3부 — RichEditor 프로덕션 버그 핫픽스 + B안 묶음 4(번다운 가독성) 완료

### Fixed
- **RichEditor 블록 스타일 복구 (h1/h2/h3/list/blockquote/pre/hr)** — 프로덕션 배포 후 사용자(댓글/답글에서 B/I/S는 동작하나 H1~H3/목록/코드블록/인용 버튼이 시각적으로 무효) 발견한 버그. 원인은 Tailwind v4 Preflight이 `<h1>`/`<ul>`/`<blockquote>` 기본 스타일을 리셋하고, `@tailwindcss/typography` 플러그인 미설치로 `prose`/`prose-sm` 클래스가 아무 CSS도 적용하지 않던 것. 인라인 마크(Bold/Italic/Strike)는 `<strong>`/`<em>`/`<s>` 태그로 Preflight 영향 없어 정상 동작. **해결: `globals.css`에 `.ProseMirror` 영역 한정으로 헤딩/리스트/인용/코드/hr 규칙 직접 정의 (약 77줄).** 플러그인 설치 대안을 피한 이유는 (a) 댓글 카드 같은 좁은 영역에서 `prose` 기본 여백이 과함, (b) 추가 의존성 없이 선택자 scope 명확, (c) 이슈 설명과 댓글 양쪽 모두 같은 규칙으로 일괄 적용 가능. `toggleHeading`/`toggleBulletList` 등 Tiptap 커맨드는 처음부터 정상 작동하고 있었음 — `<h1>` 태그 저장은 되고 있었으나 시각 스타일만 죽어 있었던 것 — `61947a9`

- **번다운 차트 모바일 가독성 (font 10→18, SVG max-w 640px)** — B안(접근성/가독성 커밋) 묶음 4. 모바일 360px 화면에서 SVG text가 `10 × (360/640) ≈ 5.6px`로 렌더돼 판독 불가하던 문제. `viewBox="0 0 640 220"` + `w-full h-auto` 조합은 컨테이너 너비에 따라 선형 스케일 → 작은 화면에서 텍스트도 함께 축소. 해결: (1) fontSize 10→18 (y-tick, x-start, x-end 3곳), (2) SVG에 `max-w-[640px] mx-auto` 추가로 와이드 데스크톱에서 과도한 확대 방지, (3) viewBox height 220→240, padding.left 36→48(3자리 레이블 "100" 수용), padding.bottom 28→32. 모바일 360px: 10.1px / 데스크톱 640px 이상: 18px 고정 — `9bd97d0`

### 배포
- `61947a9` RichEditor 핫픽스 → `devtracker-p6j3egy21` Ready (53s)
- `9bd97d0` 번다운 차트 → `devtracker-aafcee7kb` Ready (51s)
- 모든 커밋 `origin/main` 반영 완료

### 알려진 제한
- 기존 댓글(2026-04-23 이전 저장분)은 대부분 plain text로 저장돼 있어 `<p>` 태그만 포함. H1/목록 태그 미포함이라 이번 CSS 변경 영향 없음. 이번 배포 이후 새로 작성되는 댓글은 `<h1>`, `<ul>` 등 태그가 제대로 저장되고 시각 스타일도 반영됨
- BurndownChart는 여전히 스프린트 상세 페이지에서만 사용됨. 다른 차트 컴포넌트 없음

---

## [2026-04-23] 추가 — sonner 토스트 UI 도입 + 댓글/답글 RichEditor 통일

### Added
- `sonner@2.0.7` 의존성 추가. `src/components/providers.tsx`에 `<Toaster>` 마운트. 처음 `position="bottom-right"`로 배선 → 상단 중앙이 본문을 덜 가린다는 판단으로 `top-center`로 확정 — `e74dc68`, `82e15ea`
- `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx`에 `isHtmlEmpty(html)` helper — Tiptap 빈 상태 `<p></p>` + `&nbsp;`(U+00A0) 엣지 케이스를 걸러내 빈 댓글/답글 제출 방지 — `58f3949`
- `tests/e2e/toast.spec.ts` — Toaster 마운트 확인 + 사용자/프로젝트 설정 저장 실패 시 토스트 표출 Playwright 스펙. 현 세션에서 dev 서버 + Playwright 동시 기동이 PC 부담을 주는 이력(3회 크래시)으로 실제 실행 검증은 보류, 코드만 보존 — `0ecb150`

### Changed
- **핵심 mutation `onError`를 sonner `toast.error`로 배선**: 칸반 `boardMutation`(rollback + 토스트), 첨부 업로드/삭제/크기 초과, 사용자 프로필 저장, 프로젝트 설정 저장 — `r.ok` 체크로 surface만 되던 에러를 사용자에게 확실히 알림. `attachment-list.tsx`의 `error` state + 인라인 빨간 배너 JSX는 완전 제거 — `d5e1815`
- **핵심 mutation `onSuccess`에 `toast.success` 추가**: 이슈 생성, 편집 다이얼로그 저장(per-call onSuccess로 인라인 드롭다운과 분리), 댓글/답글 작성(`vars.parentId` 분기로 구분된 메시지), 첨부 업로드, 사용자/프로젝트 설정 저장 — `2204a35`
- 설정 페이지의 기존 인라인 녹색 `successMsg` 배너 + state 완전 제거, 토스트로 일원화 (에러와 대칭) — `2204a35`
- `updateMutation` mutation-level `onSuccess`에 의도 주석 추가 — per-call onSuccess가 저장 버튼의 토스트를 담당하므로 mutation 레벨에 토스트를 추가하면 인라인 드롭다운(상태/우선순위/담당자) 변경에도 스팸됨 — `2204a35`
- **댓글/답글 입력·렌더를 `RichEditor`로 통일**: 이슈 설명과 동일 Tiptap 컴포넌트 재사용. 댓글 작성 `<textarea h-24>` → `<RichEditor>`, 답글 `<textarea h-20>` → `<RichEditor>`. 렌더 3곳(댓글 탭 댓글/답글, 전체 탭 댓글)의 plain `<p whitespace-pre-wrap>` → `<RichEditor editable={false}>`. 기존 plain text 댓글은 Tiptap viewer가 자동 `<p>` 래핑해 렌더되며, `\n` 줄바꿈이 단일 문단으로 합쳐지는 미세 손실은 용인 — `58f3949`
- 답글 버튼 토글 시 `replyContent`를 빈 문자열로 리셋 — 다른 댓글의 답글 입력 내용이 새로 여는 답글 폼에 새어 들어오는 UX 회귀 차단 — `58f3949`

### Fixed
- 칸반 드래그 실패(PATCH `/board` 에러)가 rollback만 되고 사용자에게 인지되지 않던 문제 — `boardMutation.onError`에 `toast.error("칸반 순서 저장에 실패했습니다. 다시 시도해 주세요.")` 추가 — `d5e1815`
- 첨부파일 4MB 초과 업로드 시 인라인 작은 빨간 문구로만 알려주던 문제 — 토스트로 일관성 확보. 4MB 제한 자체는 ADR-016대로 Vercel 서버리스 함수 body ~4.5MB 한계 기반 유지 — `d5e1815`

### 배포
- 4개 자동 배포(`devtracker-c95hcaa40`, `devtracker-fc40sjq4g` 등) 모두 Ready (49~57s). `git push origin main` 한 번으로 빌드·배포 완료되는 흐름 반복 검증. `vercel --prod --yes` 수동 실행 없이 전체 PR 흐름 자동화 동작 확인

### 알려진 제한
- 이슈당 댓글/답글이 많을수록 viewer 모드 Tiptap 인스턴스 수 증가(퍼포먼스 관찰 대상, 5~20명 팀 규모에서는 무영향). 향후 infinite-scroll 도입 시 `React.memo` + 키 안정화 재검토
- `RichEditor`에 `autoFocus` prop 부재 — 답글 버튼 클릭 후 자동 포커스 안 됨. RichEditor 컴포넌트 개선으로 처리 예정
- `toast.spec.ts` 3개 케이스는 실제 실행 미검증 상태(코드만 커밋). CI 또는 분리된 환경에서 돌리면 됨

---

## [2026-04-23] Vercel ↔ GitHub 자동 배포 재연동 + 토스트 UI 방향 합의

### Changed
- Vercel 프로젝트 `devtracker`의 GitHub 연결 복구: `vercel git connect https://github.com/withwooyong/devtracker.git` 실행 → `Connected`. 이후 `git push origin main` 시 자동 Production 빌드가 트리거됨. 빈 커밋 `e6dec5c`로 검증 → 자동 배포 `devtracker-39lry4hmy` Ready (57s). 이전과 달리 `vercel --prod --yes` 수동 실행 불필요 — `e6dec5c`

### Fixed
- Cursor 내장 터미널 Claude Code 세션에서 `git push origin main`이 401로 실패하던 원인 규명 — 전역 `credential.helper`(AWS CodeCommit)가 아니라 Cursor IDE가 주입하는 `GIT_ASKPASS`/`VSCODE_GIT_ASKPASS_*` 환경변수가 `credential.https://github.com.helper`(gh) 체인을 우회하고 askpass IPC로 떨어져 인증 실패. Claude Code 세션 한정 영구 해결은 저장소 외부(`~/.claude/settings.json`)에서 `env`에 askpass 4개 키를 빈 문자열로 override
- 일회성 우회 경로(앞으로도 필요할 수 있음): `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`

### 배포
- `21e764f` (이전 커밋) production 상태 유지 중. 금회 `e6dec5c`는 자동 배포 검증용 빈 커밋으로 기능 변경 없음 — 자동 트리거로 `devtracker-39lry4hmy` 생성 및 Ready 확인

---

## [2026-04-22] 13-3차 ~ 13-7차 — 칸반 보드 안정화 + 대댓글 + UI 정비

### Added
- `src/components/common/user-avatar.tsx` — `avatarUrl` 있으면 이미지, 없으면 이름 해시 기반 16색 팔레트 + 이니셜. size xs/sm/md — `5dc4c98`
- `Comment.parentId String?` + self relation(`CommentReplies`) + `@@index([parentId])`로 댓글 대댓글 1-depth 구조. Turso는 `ALTER TABLE Comment ADD COLUMN parentId TEXT` + 인덱스로 먼저 마이그 — `60a2e40`
- POST `/comments` `parentId` 옵션 수신 + parent 존재/같은 이슈/1-depth 검증 — `60a2e40`
- 알림 `recipients`에 parent 댓글 작성자 추가(본인 제외), title "새 답글" 구분 — `60a2e40`
- 댓글 탭에 답글 트리 렌더(`ml-10` 들여쓰기) + "답글" 토글 버튼 + 답글 폼. 전체 탭에 `c.parentId ? "답글" : "댓글"` 배지 — `60a2e40` + `5dc4c98`
- ADR-027 "`$executeRaw` + CASE WHEN 단일 UPDATE" + ADR-028 "대댓글 1-depth 구조" 추가 — 금회 /handoff
- user-guide.md에 답글 작성 섹션 추가 — 금회 /handoff

### Changed
- `src/app/api/projects/[projectId]/board/route.ts`: `$transaction([...N update])` → `$executeRaw` + `UPDATE ... CASE WHEN` 단일 문. `Prisma.sql`/`Prisma.join`으로 파라미터 바인딩, `updatedAt` 명시 세팅. libSQL RTT 누적으로 Prisma 인터랙티브 트랜잭션 5초 타임아웃 초과(P2028)를 근본 해결 — `8a1cc2b`
- `src/app/projects/[projectKey]/board/page.tsx` `boardMutation`: React Query **optimistic update**(`onMutate` + `setQueryData`) + `onError` 롤백 + `onSettled` invalidate. `mutationFn`에 `res.ok` 체크 + throw로 에러 surface — `e47d976`
- `src/components/issues/issue-card.tsx`, 보드 데스크톱/모바일 칸반 카드 `<Link>` 3곳에 `prefetch={false}` — viewport 자동 RSC prefetch로 카드 N개 = Vercel λ N회 호출되던 비용 제거 — `e47d976`
- `KanbanColumn`의 `useSortable({ disabled: true })` → `useDroppable`로 교체. `handleDragEnd` same-column 분기를 `@dnd-kit/sortable`의 `arrayMove` 유틸로 재작성. `activeId === overId` / `oldIndex === newIndex` early return 추가 — 같은 컬럼 내 순서 변경이 동작하도록 — `088e565`
- `src/components/common/rich-editor.tsx`: `EditorContent`에 `text-gray-900` + ProseMirror 내부 요소별 색상 명시(prose 기본 중간 회색 override). `onChange?` optional, `editable={false}` 시 border/focus-ring/padding 제거 → 순수 뷰어 모드 — `ce3eaf4`
- `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx`: description 렌더를 `<pre-wrap>`에서 `<RichEditor editable={false} />`로 교체. XSS 안전(Tiptap schema 기반, `dangerouslySetInnerHTML` 미사용) — `ce3eaf4`
- 이슈 상세 아바타 3곳(댓글/답글/전체 탭)을 `<UserAvatar />`로 교체. 라벨 gray-500→600, 값/이름 gray-700→900, 시간 gray-400→500, 비활성 탭 gray-500/700→600/900, 뒤로가기/편집 버튼 gray-500→600으로 가독성 상향 — `5dc4c98`
- `prisma/seed.ts` users 배열 `"Ted"` → `"허우용"` 9곳 일괄 변경(seed 재실행 시 DB 이름이 덮어써지지 않도록). `src/app/login/page.tsx` 테스트 계정 안내 `(Ted)` → `(허우용)` — `21e764f`
- Turso User 테이블 직접 UPDATE: `withwooyong@yanadoocorp.com` → `허우용`, `Ted@yanadoocorp.com` → `테드` (DB 정정)

### Fixed
- 칸반 드래그 시 `PATCH /api/projects/[projectId]/board` 500 Internal Server Error — libSQL 직렬 RTT 누적으로 Prisma 인터랙티브 트랜잭션 5초 타임아웃 초과. ADR-027 참조 — `8a1cc2b`
- 드래그 후 카드가 즉시 반영되지 않고 서버 왕복 후에야 이동해 "굉장히 느려" 보이던 문제 — optimistic UI로 즉시 반영 — `e47d976`
- 500 응답인데도 에러가 삼켜지던 문제 — `fetch` 결과 `r.ok` 미체크가 원인. throw로 React Query `onError` 정상 발동 — `e47d976`
- 보드 진입 시 카드별 `_rsc=` prefetch로 Vercel λ가 카드 수만큼 호출되던 비용 — `prefetch={false}` — `e47d976`
- 같은 컬럼 내 카드 순서 변경이 불가하던 문제 — `useSortable({ disabled })` 오용 + splice 두 번 꼬임. `useDroppable` + `arrayMove` 표준 패턴 적용 — `088e565`
- 이슈 생성 화면 설명 에디터 폰트 흐림 — prose 기본 색상 override — `ce3eaf4`
- 이슈 상세에서 HTML 태그가 plain text로 노출되던 문제 — RichEditor 뷰어 모드로 재사용 — `ce3eaf4`
- 댓글/답글 작성자가 모두 "Ted"로 보이던 문제(원인: 두 유저 모두 이름이 "Ted"로 저장됨) — Turso UPDATE로 정정 + UserAvatar 도입 + seed 하드코딩 수정 — `5dc4c98` + `21e764f`

### 배포
- `dpl_3DcYXFihm8BKBQ6CwnzDDXWRjPq6` (8a1cc2b)
- `dpl_3yZNBaWUHc1ffcWkqrr64jNTxs7R` (e47d976)
- `dpl_5SSEDHy4hjbbRgmfzNCk6jDt1FWa` (088e565)
- `dpl_2Hi4AMX23Ya5Z8c9rX8BVkBN8k9N` (ce3eaf4)
- `dpl_JANrLuG8cTNQULt6qofDGmv9PvEj` (60a2e40)
- 금회 `21e764f` 재배포

---

## [2026-04-22 후속] 칸반 드래그 500 진단용 로깅 (진행 중)

### Added
- `src/app/api/projects/[projectId]/board/route.ts` catch 블록에 `console.error("[board PATCH]", error)` 추가 — 프로덕션에서 드래그 시 500을 반환하지만 에러가 삼켜져 Vercel Function 로그에 원인이 안 찍히던 상황 대응 — `dcfdf33`

### 진행 상태
- 프로덕션(https://devtracker-dusky.vercel.app) 칸반 드래그 시 `PATCH /api/projects/DEV/board` → **500 Internal Server Error** 반복
- 클라이언트 측 DnD는 정상: 커서 `grab`, 파란 테두리 `DragOverlay` 정상 표시
- `dcfdf33` 커밋 + `dpl_HdTN32RKEdVFe7chHKBW4WPSYG33` 배포 완료. 사용자 재현 대기 중
- 재현 후 `vercel logs --status-code=500 --expand`로 실제 에러 스택 포착 → 진짜 수정 예정
- 예상 후보: Turso `$transaction([...updates])` 호환성 / Vercel Function 타임아웃 / 스키마 드리프트

---

## [2026-04-22] 모바일 반응형 9 Phase — 전 페이지 375px 대응

### Added
- `docs/plan/mobile-responsive-plan.md` 작업계획서 (9 Phase + 검증 기준 + 리스크) — `f45dc57`
- `src/stores/ui-store.ts` — 사이드바 드로어 열림 상태(`isSidebarOpen`/`open`/`close`/`toggle`) — `f45dc57`
- `src/hooks/use-media-query.ts` — `window.matchMedia` 기반 데스크톱 감지(`min-width: 1024px`) — `f45dc57`
- `src/app/layout.tsx`에 `export const viewport: Viewport = { width: "device-width", initialScale: 1 }` — `f45dc57`
- `src/components/layout/project-tabs.tsx` — 5탭(이슈 목록/칸반/스프린트/배포/설정) 공통 네비. `aria-current="page"`, `overflow-x-auto`로 모바일 가로 스크롤 — `b4277b2`
- `src/components/issues/issue-card.tsx` — 모바일 이슈 목록 카드 뷰. 전체 Link, `line-clamp-2 break-words`, 라벨 `flex-wrap` — `d858091`
- `MobileKanbanCard`(board/page.tsx 내) — 모바일에서 DnD 대체. 제목 Link + `PriorityBadge` + 상태 `<select>` + 담당자. `handleMobileStatusChange`로 기존 `boardMutation` 재사용 — `1909ff7`
- `docs/ADR.md` ADR-026 신규 — "칸반 보드 모바일 대응 — DnD 대신 상태 pill + 카드 select". 맥락/결정/근거/대안/후속 — `1909ff7`
- `tests/e2e/mobile-responsive.spec.ts` 신규 — 4개 스모크(사이드바 드로어, 이슈 목록 카드 뷰, 칸반 상태 pill, 프로젝트 탭) — `7ed3bdf`
- `playwright.config.ts` `mobile-chrome` 프로젝트 추가(Pixel 5 393×851, `testMatch: /mobile-.*\.spec\.ts/`) — `7ed3bdf`

### Changed
- 레이아웃 셸: 사이드바를 모바일 `fixed` 드로어(`-translate-x-full` ↔ `translate-x-0`)로, `lg:` 이상 `static` 고정. 모바일+열림 시 `role="dialog"` + `aria-modal` + 첫 링크 auto-focus. 헤더에 햄버거 버튼(`lg:hidden`) + `data-sidebar-trigger`. 메인 영역 `inert`로 배경 포커스 격리, 드로어 닫힘 시 opener로 포커스 복귀. Esc/overlay 클릭 닫기. breadcrumb `truncate` + `sm:` 미만 중간 경로 숨김 — `f45dc57`
- 5개 프로젝트 하위 페이지(이슈 목록/board/sprints/deployments/settings)의 중복 탭 블록(각 32줄 × 5)을 `<ProjectTabs projectKey={projectKey} />` 한 줄로 치환 — 순감 97줄. 헤더 wrapper에 `min-w-0 flex-1 gap-3`, h1 `truncate` — `b4277b2`
- 이슈 목록: 모바일 `md:hidden space-y-2` 카드 리스트 + 데스크톱 `hidden md:block` 기존 6컬럼 table 분기. 필터 바 `flex-col md:flex-row md:flex-wrap`, 검색·select·저장 버튼 `w-full md:w-(auto|48)`. 저장된 필터 팝오버 `left-0 right-0 md:right-auto md:min-w-48`, relative 부모 `w-full md:w-auto` — `d858091`
- 이슈 상세: `grid grid-cols-3` → `flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6`. 메인 영역 먼저, 사이드바 아래 세로 스택. 댓글/활동/전체 탭 바 `overflow-x-auto` + `whitespace-nowrap`. 제목 `break-words`, 설명·댓글 3곳에 `whitespace-pre-wrap break-words` — `aa0dae7`
- 칸반 보드: 모바일(`md:hidden`)에서 상태 pill 4개(`flex gap-2 overflow-x-auto`) + 활성 상태 단일 컬럼 카드 리스트 렌더. 카드의 `<select>`로 상태 변경 → `boardMutation` 재사용. 데스크톱(`hidden md:block`)은 기존 DndContext + 4컬럼 완전 보존 — `1909ff7`
- board/deployments/settings 페이지 h1에서 suffix("- 칸반 보드"/"- 배포 이력"/" 설정") 제거. 페이지 식별은 ProjectTabs 활성 상태가 담당 — `5dcdd0f`
- 배포 이력 카드: 헤더 `flex-col sm:flex-row`, 버전 그룹 `flex-wrap min-w-0` + 버전 span `break-words`, 생성일 `shrink-0`, 설명 `break-words`, 메타 줄 `flex-wrap gap-x-2 gap-y-1`. 환경 필터 바 `overflow-x-auto pb-1 -mx-1 px-1` + 버튼 `whitespace-nowrap` — `5dcdd0f`
- 배포/스프린트/이슈/프로젝트 생성 폼의 2열 그리드 `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2` (버전/환경·시작일/종료일·상태/우선순위·담당자/마감일·프로젝트이름/키) — `5dcdd0f`·`644f22c`
- 스프린트 목록 카드: 제목/상태 pill `gap-2`, 제목 `min-w-0 flex-1 truncate`, 상태 `whitespace-nowrap`, 목표 `break-words`, 메타 `flex-wrap gap-x-3 gap-y-1` — `5dcdd0f`
- 스프린트 상세: 헤더 카드 `flex flex-col md:flex-row`, 좌측 `min-w-0 flex-1`, 제목+상태 pill `flex-wrap`, 버튼 그룹 `flex-wrap md:flex-nowrap`. 포함 이슈 `<li>`를 세로 스택(좌측 `#번호+제목` / 우측 `뱃지+제거`)으로 재편 — `3371ca6`
- 로그인 페이지 외곽 `px-4 py-6` + 카드 `p-6 sm:p-8`로 모바일 여백 확보 — `644f22c`
- 프로젝트 목록 카드 `flex-col sm:flex-row`로 재편. key pill `shrink-0`, 이름/설명 `truncate`, 카운트 그룹 `shrink-0` — `644f22c`
- not-found/error 페이지 외곽 `px-4`. error는 메시지에 `max-w-md` + `break-words` — `644f22c`

### Fixed
- 긴 프로젝트 이름/이슈 제목/URL/댓글에서 모바일 가로 오버플로 유발 지점 일괄 제거(`break-words`, `truncate`, `min-w-0 flex-1`, `whitespace-nowrap + shrink-0` 패턴) — 전반

### Documentation
- `docs/e2e-testing-guide.md`: 15 Journey 69개 → 16 Journey **73개**. Journey 16(모바일 반응형 스모크 4) + playwright.config 이중 프로젝트 구조 설명 추가
- `docs/plan/mobile-responsive-plan.md`: 9 Phase 작업계획서(목표·현황·설계 방침·각 Phase 체크리스트·검증 기준·리스크)

---

## [2026-04-21] 기술 부채 정리 묶음

### Added
- `src/types/github-link.ts`: `isGitHubLinkType(v)`, `isGitHubLinkStatus(v)` 타입 가드 추가 (내부 값 배열과 비교)
- `GitHubLinkList`에 anchor `aria-label="{타입} {힌트}: {제목}"` 부여 + 타입 pill/힌트/상태 pill에 `aria-hidden` — 스크린 리더가 링크를 한 문장으로 읽도록 통합
- E2E Journey 6에 "activities API accepts both issueNumber and issue.id (UUID)" 테스트 추가 — issueNumber/UUID 양 경로 200 + `total` 동등 검증. 총 69개
- ADR-025 신규 (기술 부채 정리 묶음 결정 기록)

### Changed
- `GitHubLink` 인터페이스의 `type`/`status`를 `GitHubLinkType`/`GitHubLinkStatus` 유니언 → `string`으로 완화해 Prisma 스키마(String) 런타임 진실과 일치. 컴포넌트는 타입 가드로 좁혀서 사용
- `GitHubLinkList`의 `as GitHubLinkType`/`as GitHubLinkStatus` 캐스트 제거 — 가드 narrowing으로 대체, 미지의 값은 회색 폴백 pill로 강등
- `activities/route.ts`와 `github-links/route.ts`의 `issueId` 파싱을 UUID-우선 정규식 → 숫자 정규식 → null 순서로 통일. `parseInt`가 UUID 앞자리를 숫자로 읽어 엉뚱한 이슈에 매칭되던 엣지 버그 차단
- `safeCompare()`(webhook 서명 검증)를 zero-pad 후 `timingSafeEqual` **항상 실행** + 길이 동등성 AND 반환으로 엄격화. 길이 분기가 비교 뒤로 이동해 길이 정보 부분 누출 여지 차단
- E2E `github-link-badges.spec.ts` 링크 locator를 `getByRole("link", { name: "PR #번호: 제목" })` 형태로 교체해 aria-label 통합 검증

### Fixed
- typeLabel이 빈 문자열일 경우 `aria-label`이 콜론으로 시작하는 엣지(스크린 리더에 어색한 낭독) → "링크" 폴백

### Security
- `safeCompare` 타이밍 엄격화 — sha256 hex 64자 고정 길이 컨텍스트에선 실질 위협 낮았지만 함수 재사용·서명 포맷 변경을 대비한 방어적 개선

### Documentation
- `docs/e2e-testing-guide.md` Journey 6 4 → 5건 / 전체 68 → 69개

---

## [2026-04-21] GitHubLink 타입 배지 UI

### Added
- `src/types/github-link.ts`: `GITHUB_LINK_TYPE_LABELS`(PR/커밋/브랜치), `GITHUB_LINK_TYPE_COLORS`(blue/slate/amber 저채도 pill) 맵, `formatGitHubLinkExternalHint(type, externalId)` 헬퍼 추가
- 이슈 상세 `GitHubLinkList`에 타입 컬러 pill + 외부 ID 힌트(PR `#번호`, COMMIT SHA 7자) 렌더링
- 루트 section·타입 pill·힌트 span에 `data-testid` 부여 — E2E 견고성 확보
- E2E Journey 15 × 2건: PR 배지+`#번호` 힌트, COMMIT 배지("커밋")+SHA 7자 힌트 렌더링 검증 — 총 68개
- ADR-024 신규 (타입 배지 UI 결정 기록)
- `docs/user-guide.md` 10-2에 타입 배지 색상·힌트 가이드 추가
- `.gitignore`에 `.claude/settings.local.json` 추가 — Claude Code 개인 설정 격리

### Changed
- `docs/e2e-testing-guide.md` 66개/14 Journey → 68개/15 Journey

### Fixed
- E2E locator 견고성: `page.locator("h3").locator("..")` XPath 부모 참조 → `page.getByTestId("github-link-section")` 직행
- PR 번호 충돌 가능성: `Date.now() % 1_000_000`(16.7분 주기 중복) → `Math.floor(Math.random() * 1e9)` (unique 제약 저촉 회피)

---

## [2026-04-21] GitHub push 이벤트 지원

### Added
- `src/app/api/webhooks/github/route.ts`: push 이벤트 핸들러(`handlePush()`) 신설. 커밋 메시지에서 이슈 키 추출 → 프로젝트/이슈 매핑 → `GitHubLink(type="COMMIT", status=null, externalId=commit.id)` upsert
- 응답 필드에 `commits: number`(페이로드 내 총 커밋 수) 추가. `matched`는 연결된 링크 수
- scoped 모드에서 매핑된 프로젝트 키의 커밋만 링크되고, 외부 키는 `skippedKeys`(중복 제거된 Set)로 응답 + `console.info` 로그
- E2E Journey 14 × 5건: 기본 링크 생성, 동일 push 재전송 dedup, 다중 commit 부분 매핑, deleted push skipped, 빈 commits matched=0
- E2E Journey 14b × 1건: scoped 모드 cross-project 커밋은 `skippedKeys`에 축적 — 총 66개
- ADR-023 신규 (push 이벤트 지원 결정 기록)
- `docs/user-guide.md` 10-2 표에 Push(commit) 행 추가, 10-3 주의사항에 push 동작 설명 추가

### Changed
- 기존 단일 POST 핸들러에서 PR 로직을 `handlePullRequest()`로 추출하고, 공통 프로젝트 조회를 `resolveProjectForKey()` 헬퍼로 분리 — behavior-preserving refactor
- push 루프의 프로젝트 조회를 `findMany({ key: { in: uniqueKeys } })`로 배치화해 legacy 모드 N+1 제거
- `deleted: true` 조기 반환 응답에도 `matched: 0, commits: 0` 포함해 응답 shape 통일
- `PullRequestPayload`/`PushPayload`/`ScopedProjectLite` 타입 추가로 핸들러 간 계약 명시
- `docs/e2e-testing-guide.md` 60개/13 Journey → 66개/14 Journey(14/14b 하위 묶음)

### Security
- push 이벤트도 기존 서명 검증(전역/프로젝트별 secret 선택) + scoped 라우팅을 그대로 적용 — 보안 경계 변경 없음

---

## [2026-04-21] GitHub 사용자 매핑

### Added
- `User.githubLogin String? @unique`, `User.githubId Int? @unique` 필드 추가 (로컬 SQLite + Turso ALTER + unique index)
- `PATCH /api/auth/me` 신설: 본인 `githubLogin`(GitHub 로그인 정규식 검증, 1~39자) / `name` 셀프 업데이트. 중복 선검사로 409 응답
- `src/app/api/webhooks/github/route.ts`: `resolvePullRequestAuthor()` — `githubId → githubLogin` 순 매칭. login 매칭 시 `githubId`를 항상 최신화하여 로그인 변경 내성 확보. 매칭 성공 시 `Activity.userId`가 매핑된 user, 실패 시 `issue.reporterId` 폴백
- webhook 응답에 `prAuthorMatched: boolean` 필드 추가 (운영·테스트 관측성)
- `/settings` 사용자 프로필 페이지 신설: 이메일·이름 read-only + GitHub 로그인 편집 + 저장 후 `auth/me` 쿼리 무효화
- 사이드바 사용자 블록에 "내 프로필" 링크 추가(현재 경로 강조 스타일)
- `src/types/user.ts`에 `githubLogin?: string | null` 필드 추가
- E2E Journey 13 × 6건: PATCH 라운드트립, 중복 409, 형식 400, 매칭된 PR → Activity가 매핑된 user 명의, 알 수 없는 PR → reporter 폴백, login 매칭 시 `githubId` 자동 저장 후 id 단독으로도 매칭 — 총 60개
- ADR-022 신규 (GitHub 사용자 매핑 결정 기록)

### Changed
- `GET /api/auth/me` 응답에 `githubLogin` 포함 (사용자 프로필 페이지 초기값 렌더링용)
- `PullRequestPayload.pull_request.user?: { login: string; id: number }` 타입 추가
- `docs/user-guide.md` 10-4 섹션 신설(GitHub 계정 연결·자동 매핑 설명), 사이드바 네비게이션 목록에 "내 프로필" 추가
- `docs/e2e-testing-guide.md` 54개/12 Journey → 60개/13 Journey (Journey 13 추가)

### Security
- 자기 프로필 외 수정 경로 없음 — `PATCH /api/auth/me`는 토큰의 `userId`로만 update. 타인 `githubLogin` 변경 불가
- 중복 `githubLogin` pre-insert 검사로 409 응답 — libSQL 어댑터의 P2002 에러 shape 의존 회피

---

## [2026-04-21] GitHub webhook 프로젝트별 secret

### Added
- `Project.githubWebhookSecret String?` 필드 추가. 설정 시 해당 프로젝트의 webhook은 전역 `GITHUB_WEBHOOK_SECRET` 대신 이 값으로 서명을 재검증 (로컬 SQLite + Turso 반영)
- `src/app/api/webhooks/github/route.ts`: 라우팅 순서 재설계 — rawBody best-effort 파싱 → `repository.full_name`으로 scoped 프로젝트 조회 → secret 선택(프로젝트 secret 있으면 우선, 없으면 전역) → HMAC 검증 → 이후 ping/pull_request 분기
- webhook 응답에 `secretSource: "project" | "global"` 필드 추가 (운영·테스트 관측성)
- 설정 페이지에 **Webhook Secret** 섹션 신설: password 입력 + 설정됨/미설정 뱃지 + 제거/제거 취소 액션. 저장 성공 후 입력값 초기화
- `src/types/project.ts`에 `githubWebhookSecretSet?: boolean` 필드 추가
- E2E Journey 10c × 3건: GET 응답에 secret 원문 비노출, 프로젝트 secret 서명 통과(`secretSource=project`), 프로젝트 secret 설정 상태에서 전역 secret 서명은 401 — 총 54개
- ADR-021 신규 (프로젝트별 webhook secret 결정 기록)

### Changed
- `GET/PATCH /api/projects/[projectId]`: 응답을 `select`로 필드 고정하고 `githubWebhookSecret` 원문은 제거, `githubWebhookSecretSet: boolean` 플래그로 대체 (서버 → 클라이언트로 평문 유출 금지)
- `updateSchema` 확장: `githubWebhookSecret`(16~256자 또는 빈 문자열→`null`). 빈 문자열은 서버에서 `null`로 정규화하여 전역 secret 재사용
- `docs/user-guide.md`의 "프로젝트 설정 편집" 섹션에 Webhook Secret 항목 추가
- `docs/e2e-testing-guide.md` 51개/12 Journey → 54개/12 Journey(10c 하위 묶음) 반영

### Security
- webhook secret은 프로젝트별 저장 후 API로 다시 흐르지 않도록 설계 (자격증명 평문 유출 방지)
- 서명 검증 전 수행하는 부작용은 `JSON.parse`와 `repo` 완전일치 `findFirst` 한 번뿐이며, 실패 시 즉시 401 — 쿼리 증폭/DoS 벡터 없음

---

## [2026-04-21] GitHub webhook 하이브리드 라우팅

### Added
- `src/app/api/webhooks/github/route.ts`: `Project.githubRepo`와 `payload.repository.full_name`이 매칭되면 "scoped" 모드로 해당 프로젝트 이슈만 처리. 매칭 없으면 기존 "legacy" 키-prefix 경로로 폴백 (`03c0ec7`)
- scoped 모드의 cross-project silent drop을 `skippedKeys` 응답 필드 + `console.info` 로그로 관측성 보강
- 응답에 `mode: "scoped" | "legacy"` 필드 추가
- E2E Journey 10b × 3건: scoped 매칭, scoped 다른 키 무시, scoped cross-project 부분 처리 (`03c0ec7`) — 총 51개
- ADR-020 신규 (하이브리드 라우팅 결정 기록)

### Changed
- `PullRequestPayload.repository`를 optional로 변경(`?: { full_name: string }`) — GitHub이 필드를 누락해도 null-safe하게 legacy로 폴백
- E2E `beforeAll/afterAll`을 `playwright.request.newContext()`로 독립 세션화, `afterAll` 복원 응답 status 검증 추가 (쿠키 격리 불확실성 제거, 테스트 상태 오염 방지)
- `docs/e2e-testing-guide.md` 48개/12 Journey → 51개/12 Journey(10b 하위 묶음) 반영

---

## [2026-04-21] 프로젝트 설정 페이지 1차

### Added
- `Project.githubRepo String?` (`"owner/repo"` 형식) 필드 추가. Turso에도 `ALTER TABLE` 반영 (`7a82bb4`)
- `/projects/[projectKey]/settings` 신규 클라이언트 페이지: 설명·GitHub 레포 편집 폼. 권한 없는 사용자에게는 읽기 전용 안내 표시 (`7a82bb4`)
- 4개 프로젝트 탭 페이지(이슈 목록·칸반·스프린트·배포 이력)에 **설정** 링크 추가 (`7a82bb4`)
- E2E Journey 12 × 5건: 탭 노출, 폼 로드, 정상 저장, 형식 오류, 미인증 401 (`7a82bb4`) — 총 48개
- ADR-019 신규 (프로젝트 설정 1차 스코프 결정 기록)

### Changed
- `PATCH /api/projects/[projectId]` 권한: `role === "ADMIN"` → `role === "ADMIN" || createdById === user.userId` (프로젝트 생성자도 본인 프로젝트 메타 편집 가능) (`7a82bb4`)
- `PATCH` 응답 코드 분리: 401(미인증), 403(권한 부족), 404(없음). zod 오류 시 `details` 동반한 400 응답
- `updateSchema` 확장: `description`(max 2000, nullable), `githubRepo`(빈 문자열 또는 `^(?!.*\.\.)[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$`). 빈 문자열은 서버에서 `null`로 정규화
- `docs/user-guide.md`에 "프로젝트 설정 편집" 섹션 추가, 프로젝트 탭 목록 갱신 (설정 포함)
- `docs/e2e-testing-guide.md` 43개 → 48개, Journey 11개 → 12개 반영

### Fixed
- Settings 페이지 초기 렌더에서 `useEffect` 안에 `setState`를 호출하던 안티패턴(react-hooks/set-state-in-effect 린트 에러) 제거 — 폼을 별도 컴포넌트로 분리하고 `key={project.id}`로 mount 리셋
- 설정 폼의 label과 input을 `htmlFor`/`id`로 연결 (접근성 + Playwright `getByLabel` 매칭)

---

## [2026-04-21] 알림 Outbox Transactional 승격

### Added
- `src/lib/notification.ts`: `enqueueNotificationsTx(tx, inputs)` + `triggerNotificationDrain()` — outbox insert를 호출자의 `$transaction` 안에서만 수행하도록 타입으로 강제 (`a38aaa9`)

### Changed
- 이슈 PATCH: `issue.update` + `activity.createMany` + 알림 enqueue를 단일 `prisma.$transaction`으로 묶음 (`a38aaa9`)
- 댓글 POST: `comment.create` + `activity.create` + 알림 enqueue를 단일 `prisma.$transaction`으로 묶음 (`a38aaa9`)
- 스프린트 PATCH: `sprint.update` + 알림 enqueue를 단일 `prisma.$transaction`으로 묶음. assignee 목록 read는 tx 밖으로 분리해 write-only tx 유지 (libSQL 단일 라이터 lock 경쟁 최소화) (`a38aaa9`)
- `triggerNotificationDrain()`은 트랜잭션 커밋 성공 후에만 호출, 실제 알림이 enqueue된 경우에만 호출하도록 가드 추가
- ADR-018 아토믹성 보강 절 추가, HANDOFF "Outbox 진정한 아토믹성 미보장" 항목 제거

### Removed
- `createNotification` / `createNotifications` 기존 API — 호출자가 트랜잭션 밖에서 outbox에 insert하지 못하도록 삭제

### Fixed
- 본 요청 커밋 후 outbox insert 실패 시 알림 유실, 본 요청 롤백 후 outbox insert가 살아남아 유령 알림이 생기는 가능성 제거

---

## [2026-04-20] Phase 2·3 + 분리 이슈 일괄 처리

### Added
- Phase 2-1 스프린트: `Sprint` 모델, `Issue.sprintId`/`completedAt`, SVG 번다운 차트, 목록/생성/상세 페이지 (`9bdf6b0`)
- Phase 2-2 인앱 알림: `Notification` 모델, 헤더 벨 드롭다운(30초 폴링), 5종 트리거 통합 (`3783430`)
- Phase 3-1 파일 첨부: `Attachment` 모델 + Vercel Blob Private store + 프록시 다운로드 엔드포인트 + 드래그앤드롭 UI (`b263347`, `77b60a7`)
- Phase 3-2 GitHub Webhook: `GitHubLink` 모델 + HMAC SHA-256 검증 + PR 제목 이슈 키 자동 연결 + 머지 시 DONE 전환 (`fc81bff`)
- 알림 Outbox 패턴: `NotificationOutbox` + 인라인 드레인 + 일일 cron safety net (`ea877a4`, `5d2bf99`)
- E2E 테스트 22건 추가 (스프린트 6, 첨부 7, GitHub 6, 알림 Outbox 4 + 기타 회귀) — 총 43개
- ADR-013~018 추가 (스프린트/알림/Prisma 빌드/Blob/GitHub webhook/Outbox)
- 문서 현행화: user-guide에 Phase 2·3 섹션, e2e-testing-guide 43개 반영, feature-roadmap-plan 완료 표시

### Changed
- 이슈 PATCH에 `sprintId` 허용 + cross-project IDOR 검증
- 이슈 PATCH의 `completedAt` 자동 기록(status→DONE 전환 시)
- Issue API `?sprintId=none` 필터 추가로 백로그 조회 100개 제한 해소 (`287a804`)
- 알림 트리거가 Notification을 직접 생성 → NotificationOutbox에 insert 후 드레인 (ADR-018)
- 첨부 Blob store를 Public → Private로 재생성, 모든 접근이 서버 프록시 경유 (`77b60a7`)
- proxy.ts 공개 경로에 `/api/webhooks`, `/api/cron` 추가 (쿠키 없는 호출 허용)
- `.npmrc` + `next.config.ts serverExternalPackages` + `package.json build --webpack`으로 Vercel Prisma 7 호이스팅 이슈 해결 (`f04cb0d`)

### Fixed
- UUID로 시작하는 숫자가 `parseInt`로 잘못 해석돼 `issueNumber`로 조회되던 버그 (`/^\d+$/` 엄격 검사로 교체)
- 스프린트 생성 폼이 zod 상세 에러 메시지를 surface하지 않던 문제 (`43d33f3`)
- 알림 시스템 리뷰 지적사항 반영: `ids.max(100)`, link 내부 경로 검증, HTML 태그 제거 (`f4548ac`)
- 파일 첨부 보안 리뷰 반영: orphan blob 롤백, sanitizeFilename `..` 방어, 이슈당 20개 제한, MIME magic byte 교차 검증

### Removed
- 기존 Public Vercel Blob store 및 관련 Attachment 레코드 전부 (Private 마이그레이션)

---

## [2026-04-13] Phase 1 기능 고도화 + Dead Code 정리

### Added
- 리치 텍스트 에디터 (tiptap) — 이슈 설명/댓글에 마크다운 지원
- 이슈 활동 로그 — Activity 모델 + 변경 히스토리 타임라인 (댓글/활동/전체 탭)
- 저장된 필터 — SavedFilter 모델 + CRUD API + 필터 저장/적용 UI
- E2E 테스트 14개 추가 (리치 에디터 4, 활동 로그 4, 저장된 필터 6) — 총 21개
- Vercel 배포 완료 — https://devtracker-dusky.vercel.app
- 유사 오픈소스 리서치 문서 + 기능 로드맵 작업계획서

### Changed
- Issue PATCH/POST/Comment POST에 Activity 자동 생성
- 이슈 생성/상세: textarea → RichEditor 교체
- 이슈 목록: 저장된 필터 드롭다운 + 필터 저장 UI 추가

### Fixed
- 저장된 필터 적용 버그 — `handleApplyFilter`에서 JSON 문자열 파싱 누락

### Removed
- Dead code: `rich-viewer.tsx`, `src/lib/utils.ts`, 미사용 import/상수
- 미사용 npm 의존성 12개: `jose`, `react-hook-form`, `uuid`, `clsx`, `tailwind-merge` 등

---

## [2026-04-13] Turso(libSQL) 마이그레이션

### Changed
- DB를 로컬 SQLite(better-sqlite3) → Turso 클라우드(libSQL)로 전환
- `src/lib/prisma.ts` — `PrismaLibSql` factory 패턴으로 어댑터 교체
- `prisma/seed.ts` — Turso 어댑터로 시드 데이터 삽입
- `prisma/prisma.config.ts` — datasource URL 제거 (schema 경로만 유지)
- `CLAUDE.md` — Turso 관련 명령어/아키텍처 업데이트

### Removed
- `@prisma/adapter-better-sqlite3`, `better-sqlite3` 의존성 제거
- `@libsql/client` 직접 의존성 제거 (`@prisma/adapter-libsql`의 transitive dependency로 자동 설치됨)

---

## [2026-04-12] 보안 강화 및 코드리뷰 반영

### Added
- `src/proxy.ts` 재작성 — `auth.ts`의 verify 함수 import, 인증 미들웨어 정상 동작
- `src/app/error.tsx` — 글로벌 에러 바운더리 (프로덕션 시 에러 메시지 숨김)
- `src/app/not-found.tsx` — 404 페이지
- `next.config.ts` 보안 헤더 — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- E2E 테스트 7개 — Playwright 기반 (로그인, 대시보드, 프로젝트 네비게이션)
- `docs/PLAN.md` — 프로젝트 구현 계획서
- `docs/ted-run-guide.md` — /ted-run 명령어 사용 가이드
- `docs/e2e-testing-guide.md` — E2E 테스트 실행/작성 가이드
- `@prisma/client-runtime-utils` 의존성 추가 (Turbopack 호환)

### Changed
- `src/lib/auth.ts` — JWT secret fallback 제거, lazy 함수로 환경변수 필수화. `isJwtPayload` typeof 검증 강화
- 모든 API route에 projectId 범위 검증 추가 (cross-project IDOR 방지)
- Project PATCH/DELETE, Deployment PATCH에 ADMIN 역할 체크 추가
- Deployment POST — PROD 배포 생성은 ADMIN만 가능
- Issue DELETE에 프로젝트 소속 확인 + try/catch 추가
- Issue 번호 생성을 `$transaction`으로 감싸서 race condition 해결
- Board 일괄 업데이트를 `$transaction`으로 변경 + 이슈 프로젝트 소속 검증
- Comment GET/POST에 projectId → issueId 범위 검증 추가
- `issues/route.ts` — limit 상한 100, page/limit NaN 방어
- `deployments/route.ts` — environment 쿼리 파라미터 enum 검증
- 모든 페이지 `queryFn`에 `r.ok` 체크 추가
- `src/hooks/use-auth.ts` — 무한 루프 수정 (빈 deps + useRef)
- `src/stores/auth-store.ts` — logout `.catch().finally()` 추가
- `src/components/common/status-badge.tsx` — 상수 중복 제거, `types/` import

### Fixed
- JWT fallback secret 하드코딩 보안 취약점
- proxy.ts 미들웨어 미동작 (파일명/함수명 수정)
- Issue GET handler IDOR 취약점 (UUID 접근 시 projectId 미검증)
- Board PATCH cross-project 이슈 조작 가능 취약점
- Deployment PATCH/POST 권한 미체크 취약점
- useAuth 인증 실패 시 무한 fetch 루프
- proxy.ts verify 호출 시 env 변수 미설정 크래시

### Removed
- `src/middleware.ts` — Next.js 16에서 deprecated (proxy.ts로 대체)
