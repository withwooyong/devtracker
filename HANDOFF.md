# Session Handoff

> Last updated: 2026-04-23 (KST, /handoff 5부)
> Branch: `main`
> Latest commit: `6fda696` — feat: 이슈 상세/생성/댓글 페이지 shadcn UI 전환
> Production: https://devtracker-dusky.vercel.app

## Current Status

**✅ 5부(shadcn/ui 도입 + 칸반 감성 효과 + 이슈 상세/생성 shadcn 전환) 완료.** 청크 1 전체 완주. 이제 프로젝트는 shadcn 토큰 체계(OKLCH 기반, 라이트/다크 준비됨) + 칸반 보드에 ambient/tilt/magnetic/skeleton 효과가 살아 있고, 이슈 생성/상세/편집/댓글/답글/사이드바까지 전부 shadcn 컴포넌트로 전환됨. 다크모드 토글 UI만 붙이면 다크도 즉시 동작. **다음 세션 최우선은 남은 페이지들(대시보드/프로젝트 목록/설정/배포/스프린트)의 shadcn 전환** — 토큰은 이미 다 구축돼 있어 bg/border 치환 위주 작업.

## Completed This Session (2026-04-23 5부)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 방향 결정: C안(shadcn 전체 도입 + 칸반 효과 + 점진 페이지 전환). 탐색형 질문에 3안 제시 후 사용자가 C 승인 | — | — |
| 2 | shadcn 의존성 9종 추가(clsx, tailwind-merge, cva, radix-slot/select/avatar/separator, lucide-react, tw-animate-css) | `3423468` | `package.json`, `pnpm-lock.yaml` |
| 3 | 토큰 인프라 구축: `src/lib/utils.ts`(cn), `components.json`, `globals.css` OKLCH 전면 재작성(라이트/다크 + `@theme inline` + `@custom-variant dark`) + 칸반 커스텀 토큰(`--kanban-*`) + 효과 CSS(ambient-column, tilt-card, skeleton-shimmer, prefers-reduced-motion) | `3423468` | `src/lib/utils.ts`, `components.json`, `src/app/globals.css` |
| 4 | shadcn UI 컴포넌트 7종 수동 작성: Button/Card/Badge(커스텀 tonal variants)/Skeleton/Avatar/Separator/Select | `3423468` | `src/components/ui/*.tsx` |
| 5 | `common/status-badge.tsx` → Badge variant 체계로 리팩토링(외부 호출부 시그니처 유지) | `3423468` | `src/components/common/status-badge.tsx` |
| 6 | `use-tilt.ts` 훅: 포인터 위치 → CSS 변수 주입, RAF 배칭, DnD 중 비활성 | `3423468` | `src/components/board/use-tilt.ts` |
| 7 | 칸반 보드 전면 리팩토링: ambient gradient mesh + dragover pulse glow + 3D tilt + magnetic + DragOverlay rotate + Skeleton 보드, 모바일 네이티브 select → shadcn Select + 컬럼 dot | `3423468` | `src/app/projects/[projectKey]/board/page.tsx` |
| 8 | Input/Textarea/Label ui 컴포넌트 추가 | `6fda696` | `src/components/ui/{input,textarea,label}.tsx` |
| 9 | 이슈 생성 페이지 shadcn 전환: Card + Input + Select + Label htmlFor + Button. Radix Select 빈값 제약 → `UNASSIGNED` 센티넬(module scope) | `6fda696` | `src/app/projects/[projectKey]/issues/new/page.tsx` |
| 10 | 이슈 상세 페이지 shadcn 전환: 모든 카드형 div → Card, 편집 Input/Textarea, 사이드바 3개 Select + Separator, 로딩 Skeleton 레이아웃, 답글 `bg-muted/40` 들여쓰기 | `6fda696` | `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx` |
| 11 | typescript-reviewer 코드 리뷰 → CRITICAL 1건(`<Card asChild>`) 즉시 수정(form outer + Card inner 재배치) | `6fda696` | 동일 |
| 12 | 빌드 검증 2회(shadcn 도입 후, 이슈 페이지 전환 후) 모두 통과 — TypeScript 2.5~2.6s, 18 페이지 OK | — | — |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 남은 페이지 shadcn 전환 (대시보드, 프로젝트 목록/메인/설정, 배포 목록/신규, 스프린트 목록/상세/신규, 전역 설정) | Pending | 토큰 체계 구축됨 → 주로 `bg-white/border-gray-*` → `bg-card/border-border` 치환 + Card/Button 래핑. 각 페이지 10~30분 예상 |
| 2 | 다크모드 토글 UI | Pending | `globals.css`의 `.dark` 토큰은 준비 완료. 헤더/설정에 토글 버튼만 추가하면 즉시 동작. `next-themes` 도입 고려 |
| 3 | B안 묶음 2(팝오버 외부 클릭 닫힘) | Pending | 3부 시점부터 남아 있던 과제. shadcn `Popover`(Radix) 사용하면 외부 클릭 닫힘이 기본 지원되므로 이 전환과 함께 해결 가능 |
| 4 | 모바일 select 옵션 피커 실기 재검증 | Pending | 4부에서 `043855b` 핫픽스 후 사용자 실기 확인 대기. 5부 작업으로 모바일 칸반 select가 shadcn Select(Radix)로 교체되어 native 피커 이슈 자체가 원천 차단됨. 사용자 확인으로 해소 여부 확정 필요 |

## Key Decisions Made

### shadcn/ui 전면 도입 — Tailwind v4 네이티브 경로
- **범위**: 토큰 체계 + UI 컴포넌트 + 칸반 효과 + 이슈 관련 페이지 전환까지 한 청크로 묶음. 사용자가 "개발 중인 시스템이라 한 번에 가도 괜찮다"고 명시 승인
- **style 선택**: `new-york` + `baseColor: slate`. OKLCH 기반으로 라이트/다크 대칭. `@theme inline`으로 Tailwind v4 유틸리티에 토큰 노출
- **수동 작성 채택**: `pnpm dlx shadcn@latest add ...` 대신 공식 소스 기반으로 `src/components/ui/`에 직접 작성. CLI 네트워크 의존 없음 + 컴포넌트 커스터마이즈 용이(예: Badge에 tonal variants slate/blue/amber/emerald/orange/red/purple 추가)
- **기존 ProseMirror/네이티브 폼 스타일 보존**: shadcn 컴포넌트는 `data-slot` 속성을 항상 붙이므로 `input:not([data-slot])` 선택자로 기존 네이티브 요소와 분리. 기존 RichEditor 규칙과 비shadcn 폼 요소는 영향 없음

### 칸반 감성 효과 — 컬럼 ambient + 카드 tilt/magnetic
- **Ambient**: CSS 변수(`--column-base`, `--column-glow`)를 인라인 style로 주입 → `.ambient-column::before`의 radial + linear gradient가 컬럼별로 다른 색감. 드래그오버(`data-dragover`)일 때 `::after`로 glow 링 + `ambient-pulse` keyframe 애니메이션
- **Tilt + Magnetic + Spotlight**: `useTilt` 훅 하나로 4개 효과 CSS 변수(`--tilt-x/y`, `--mag-x/y`, `--pointer-x/y`, `--tilt-glow`)를 일괄 관리. `requestAnimationFrame` 배칭으로 pointermove 쓰로틀링. `active: !isDragging`으로 DnD와 간섭 회피. `onPointerDown`에서도 리셋해 드래그 시작 시 tilt 잔상 제거
- **Skeleton shimmer**: tw-animate-css의 `animate-pulse` 대신 `background-position` 기반 좌→우 하이라이트 keyframe. Card + Skeleton 조합으로 칸반 보드 전체 레이아웃을 플레이스홀더로 모방
- **`prefers-reduced-motion` 존중**: 전역 media query에서 tilt/ambient/shimmer 모두 비활성화 (`transform: none !important`)

### Radix Select 빈 문자열 제약 — `UNASSIGNED` 센티넬
- Radix `SelectItem`은 `value=""`를 허용하지 않음(value를 placeholder/clear 트리거로 예약)
- **해결**: module scope 상수 `UNASSIGNED = "__unassigned__"` 센티넬 도입. 상태는 계속 `""` 또는 `null`로 유지하고 UI 경계에서만 변환
  - `value={assigneeId || UNASSIGNED}` (상태→UI)
  - `onValueChange={v => v === UNASSIGNED ? "" : v}` (UI→상태)
  - 제출 시 `assigneeId || null` (상태→API)
- 이슈 생성/상세 두 페이지 모두 동일 패턴 적용. 상태/우선순위는 항상 non-empty 값이므로 센티넬 불필요

### `<Card asChild>` 미지원 — form outer 재배치
- 초기 구현에서 답글 폼을 `<Card asChild><form>...</form></Card>`로 작성
- 현 `Card` 컴포넌트는 Radix `Slot`을 사용하지 않고 `<div>`를 고정 렌더 → `asChild`는 TS 에러 + 런타임에선 unknown prop으로 누수
- **해결**: `<form>`을 outer로, `<Card>`를 inner로 재배치. form 제출 동작 + 카드 시각 모두 정상. 나중에 Card를 Slot 기반으로 확장할지는 케이스 쌓이면 재검토
- 코드 리뷰에서 CRITICAL로 분류되어 즉시 수정

### 점진 전환 전략 — 청크 1 끝, 나머지 페이지는 다음 세션
- 토큰이 먼저 바뀌어도 기존 Tailwind 색 유틸리티는 그대로 동작하므로 미전환 페이지도 깨지지 않음
- 전환 우선순위 제안: 대시보드(노출도) → 프로젝트 목록 → 프로젝트 메인(이슈 목록) → 설정류 → 배포/스프린트. 각각 Card + Button + Select + Input 치환 중심

## Known Issues

### 이번 세션 신규
- **git push askpass 이슈 재발 패턴** — `~/.claude/settings.json`으로 GIT_ASKPASS 무력화했음에도 첫 시도에서 `fatal: could not read Username for ... Device not configured` 발생. 기록된 회피책(`git -c credential.helper='!gh auth git-credential' push`)으로 해결. memory의 `git_push_credential_helper.md` 절차대로 진행 가능. 영구 수정이 실제로 모든 케이스를 커버하지 못하는지 재점검 필요
- **lucide-react 1.8.0 버전 특이사항** — 메이저 버전이 예상보다 앞섬(일반적으로 lucide-react는 0.4xx 대). `ChevronDownIcon`/`ChevronUpIcon`/`CheckIcon` named export 모두 존재 확인. 현재는 Select에서만 사용 중이지만 향후 아이콘 추가 시 정식 공식 패키지인지 확인 필요

### 이번 세션과 무관 (기존)
- 모바일 select 옵션 피커 실기 재검증 (4부부터 이월). 5부 작업으로 자연 해소 가능성 높음
- `@tailwindcss/typography` 플러그인 부재 — 의도적. RichEditor 블록 스타일이 `globals.css`의 `.ProseMirror` 규칙에 의존. 5부에서도 유지
- BurndownChart 와이드 데스크톱(2000px+) 640px 캡 — 현재 프로젝트 레이아웃(max-w-6xl 1152px)에서는 무영향

## Context for Next Session

**사용자 원래 의도**: "shadcn 사용하고 있지 않나? 좀더 shadcn 스럽거나 트렐로 스러우면 좋을 것 같은데. ambient, skeleton, tilt, magnetic 효과를 좀 넣어서 동적인 효과도 주면 좋을 것 같아." — 실제로는 shadcn 미설치 상태였음을 확인하고 전체 도입을 제안. A(효과만)/B(shadcn만)/C(둘 다) 3안 제시했고 사용자가 C 선택.

**다음 세션 진입 가이드**:
1. **남은 페이지 shadcn 전환** — 대시보드부터 시작 권장(사용자가 가장 자주 보는 화면). `bg-white` → `bg-card`, `border-gray-200` → `border-border`, `text-gray-900` → `text-foreground`, `text-gray-500/600` → `text-muted-foreground` 치환이 대부분. 카드형 div는 `Card` + `CardContent`, 버튼은 `Button` + variant, 폼 요소는 `Input`/`Textarea`/`Select`/`Label`
2. **다크모드 토글** — shadcn 토큰이 준비됨. `next-themes` 1줄 도입 + 헤더에 토글 버튼 하나로 완성. 이슈 상세처럼 label/border 색이 많은 페이지에서 가시 검증 필요
3. **Popover 교체 시 B안 묶음 2 자연 해결** — shadcn Popover(Radix) 사용하면 외부 클릭 닫힘이 기본 동작. 현재 자체 구현 팝오버가 남아 있는지 grep 필요

**사용자 선호/작업 패턴**:
- 탐색형 질문("~하면 좋을 것 같은데") → 3안 제시 + 추천 + 트레이드오프 → 사용자 선택 → 착수 패턴 유지
- /ted-run 파이프라인 애용 (계획서 기반 or 자유 인자 둘 다 수용)
- 큰 변경은 청크로 쪼개 각 청크마다 빌드 검증 + 코드 리뷰 + 커밋 + 사용자 승인 후 푸시
- **커밋과 푸시는 별개 명령** — 사용자 명시 요청 시에만 푸시. 한 명령에 묶지 않음(global CLAUDE.md 규칙)
- 커밋 메시지는 한글

## Files Modified This Session

```
 components.json                                    |  21 +  (new)
 package.json                                       |   9 +
 pnpm-lock.yaml                                     | 668 +
 src/app/globals.css                                | 327 +/-
 src/app/projects/[projectKey]/board/page.tsx       | 380 +/-
 .../[projectKey]/issues/[issueNumber]/page.tsx     | 760 +/-
 src/app/projects/[projectKey]/issues/new/page.tsx  | 329 +/-
 src/components/board/use-tilt.ts                   |  61 +  (new)
 src/components/common/status-badge.tsx             |  73 +/-
 src/components/ui/avatar.tsx                       |  53 +  (new)
 src/components/ui/badge.tsx                        |  59 +  (new)
 src/components/ui/button.tsx                       |  58 +  (new)
 src/components/ui/card.tsx                         |  92 +  (new)
 src/components/ui/input.tsx                        |  21 +  (new)
 src/components/ui/label.tsx                        |  19 +  (new)
 src/components/ui/select.tsx                       | 185 +  (new)
 src/components/ui/separator.tsx                    |  28 +  (new)
 src/components/ui/skeleton.tsx                     |  15 +  (new)
 src/components/ui/textarea.tsx                     |  21 +  (new)
 src/lib/utils.ts                                   |   6 +  (new)
 CHANGELOG.md / HANDOFF.md / docs/ADR.md            | (this /handoff)
```

## Recent Commits

```
6fda696  feat: 이슈 상세/생성/댓글 페이지 shadcn UI 전환
3423468  feat: shadcn 도입 + 칸반 보드 ambient/tilt/magnetic/skeleton 효과
3306cff  docs: /handoff 2026-04-23 4부 — 모바일 select 핫픽스 기록
043855b  fix: 모바일 칸반 상태 select 옵션 피커 표시 문제 핫픽스
609a687  docs: /handoff 2026-04-23 3부 — RichEditor 핫픽스 + B안 묶음 4 번다운 가독성
9bd97d0  fix: 번다운 차트 모바일 가독성 (font 10→18, max-w 640px)
61947a9  fix: RichEditor 블록 스타일 복구 (h1/h2/h3/list/blockquote/pre/hr)
31e4d17  docs: /handoff 2026-04-23 2부 — sonner 토스트 + 댓글 RichEditor 통일
58f3949  feat: 댓글/답글 입력·렌더를 RichEditor로 통일
2204a35  feat: 핵심 mutation onSuccess에 성공 토스트 추가
```

## Production Deployment

- `3423468` → Vercel 자동 배포 트리거(push 시점에 Vercel ↔ GitHub 자동 연동 동작)
- `6fda696` → Vercel 자동 배포 트리거
- 프로덕션 URL: https://devtracker-dusky.vercel.app
