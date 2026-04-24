# Session Handoff

> Last updated: 2026-04-24 (KST, /handoff 7부 — 청크 3 완료)
> Branch: `main`
> Latest commit: `5211ab0` — feat: 레이아웃/공통 컴포넌트 하드코딩 색 → 토큰 치환 (청크 3-d)
> Production: https://devtracker-dusky.vercel.app

## Current Status

**✅ shadcn/ui 전환 전체 완결.** 청크 1(인프라 + 칸반 + 이슈, 2026-04-23) · 청크 2(나머지 9개 페이지, 2026-04-24 전반) · 청크 3(다크모드 + AlertDialog + success variant + 레이아웃/공통 토큰 치환, 2026-04-24 후반)까지 3세션 파이프라인 완료. 이제 앱 전체가 OKLCH 토큰 + shadcn 컴포넌트 기반이며 **다크모드 토글 한 번으로 라이트↔다크 전환**이 동작한다.

## Completed This Session (2026-04-24 후반, 청크 3 — 3-a/b/c/d)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 3-a 다크모드 토글: next-themes 0.4.6, ThemeProvider(attribute="class"), ThemeToggle(Sun/Moon + mounted guard + Button relative), `<html suppressHydrationWarning>` | `651f9f4` | `layout.tsx`, `providers.tsx`, `common/theme-toggle.tsx`(신규), `layout/header.tsx` |
| 2 | 3-b Button `success` variant 추가 + 스프린트 완료 버튼 치환. 핸드오프 제안 `text-primary-foreground` 대신 `text-white` 채택(다크 대비 문제) | `eb372e1` | `ui/button.tsx`, `sprints/[sprintId]/page.tsx` |
| 3 | 3-c AlertDialog 도입: @radix-ui/react-alert-dialog + shadcn 공식 래퍼. 스프린트 삭제 + 첨부 삭제 `confirm()` 교체(grep으로 2곳 확인). Action에 `disabled={isPending}`로 중복 DELETE 차단 | `abc3a8a` | `ui/alert-dialog.tsx`(신규), `sprints/[sprintId]/page.tsx`, `common/attachment-list.tsx` |
| 4 | 3-d 레이아웃/공통 토큰 치환: header / project-tabs / main-layout / notification-dropdown / attachment-list 전면 토큰화. 알림 읽음 전 행 `bg-blue-50/60 dark:bg-blue-950/30`로 시맨틱 복원 | `5211ab0` | 5개 파일 |
| 5 | 각 청크마다 typescript-reviewer로 리뷰 → CRITICAL 0건, HIGH 1건(3-a lint), MEDIUM 7건 전부 즉시 반영, LOW 1건 기록 | — | 위 파일들 |
| 6 | 각 청크 빌드 검증 전부 통과 (TS 2.4~2.7s, 18페이지 OK) | — | — |
| 7 | 커밋만 완료, 원격 푸시는 이 /handoff 커밋과 일괄 예정 | — | — |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 다크모드 실기 검증 | Pending | 토큰/토글 체계 완료됐으나 라이트↔다크 왕복 가시 검증 미수행. 특히 알림 드롭다운, 첨부 리스트, 스프린트 상세, 이슈 상세가 검증 우선순위. `pnpm dev` 또는 production 배포 후 확인 |
| 2 | 원격 푸시 | Pending | 로컬 4개 커밋(3-a/b/c/d) + 이 /handoff 커밋 = 총 5개가 origin보다 앞섬. 사용자 지시로 푸시 예정 |
| 3 | `lucide-react` 1.8.0 버전 출처 재확인 | Pending (LOW) | 이월 |
| 4 | BurndownChart 와이드 데스크톱(2000px+) 캡 | Pending (LOW) | 이월, 현재 레이아웃에서 무영향 |
| 5 | success variant `dark:hover:bg-emerald-400` + white 대비 ~2:1 | Pending (LOW) | 리뷰 지적. WCAG AA 미달이지만 핸드오프 prescribed 패턴이라 유지. hover 단계 조정 여지 기록 |

## Key Decisions Made

### next-themes는 QueryClientProvider 바깥에 배치
- `ThemeProvider`가 `QueryClientProvider`를 감싸도록 Providers에 래핑. 테마 변경은 QueryClient와 무관하지만 provider 순서는 "데이터를 의존하지 않는 바깥"이 관례
- `disableTransitionOnChange`로 테마 토글 시 모든 CSS transition 순간 비활성 → 깜빡임 차단
- `defaultTheme="system"` + `enableSystem`으로 OS 설정 자동 반영

### ThemeToggle의 mounted guard는 필수 + ESLint 충돌은 인라인 disable
- next-themes는 클라이언트에서만 `resolvedTheme`을 계산하므로 SSR 시 초기 렌더와 하이드레이션 후 값이 달라질 수 있음 → `useState(false)` + `useEffect(() => setMounted(true), [])` 패턴이 공식 권장
- 그런데 프로젝트 ESLint 규칙 `react-hooks/set-state-in-effect`가 이 패턴을 error로 잡음 → **해당 한 줄만 `eslint-disable-next-line` + 주석**으로 이유 명시. 규칙 자체 튜닝은 과함
- `absolute` 포지션 Moon 아이콘이 positioning context를 찾아 viewport까지 이탈하는 잠재 버그 → Button에 `relative` 클래스 명시

### success variant의 `text-white` 선택 — 핸드오프 제안과 편차
- 핸드오프는 `text-primary-foreground`를 제안했으나, slate 테마에서 `--primary-foreground`는 라이트=near-white / 다크=near-black으로 **뒤집힘**
- emerald-500(다크 배경) 위에 near-black 텍스트는 시각적으로 잘못된 조합 → `text-white`로 고정(양쪽 모드 동일)
- 향후 `--success` + `--success-foreground` 시맨틱 토큰을 globals.css에 추가하면 cva를 그쪽으로 전환 가능(현재는 단일 사용처라 보류)

### AlertDialog는 state 대신 `asChild` trigger로 — per-item은 자연스러움
- 리스트 아이템마다 AlertDialog를 반복 렌더하는 패턴은 Radix Portal이 open 시만 DOM에 마운트하므로 perf 문제 없음(리뷰 확인)
- `AlertDialogTrigger asChild`로 기존 Button/native button을 그대로 감싸고, Action의 `onClick`에서 `mutate()` 호출
- **중복 DELETE 차단**: `AlertDialogAction`은 클릭 즉시 애니메이션과 함께 닫혀도 Radix가 `mutate()`는 동기로 먼저 호출 → 유저가 빠른 연타로 DELETE를 두 번 발사 가능. `disabled={mutation.isPending}`를 Action에 명시로 차단

### `confirm()` 실제 사용처 2곳 — grep이 핸드오프보다 정확
- 핸드오프는 스프린트 삭제 1곳만 예상했으나 `git grep -n 'confirm('`로 **첨부 삭제**(`attachment-list.tsx`)도 발견
- 교훈: 다음부터 후속 작업 착수 전 항상 grep으로 재확인

### sidebar는 스킵, user-avatar도 스킵
- `sidebar.tsx`는 원본 디자인이 `bg-gray-900 text-white` **항상 다크** — 다크모드에서도 다크 유지가 사용자 기대에 부합하고, 라이트 사이드바를 만들려면 별도 `--sidebar-*` 토큰 세트가 필요해 범위 초과
- `user-avatar.tsx`의 `bg-{red,blue,green,...}-500` 팔레트는 **사용자 식별**용이라 테마와 독립이어야 함

### 알림 읽음 전 행의 `bg-accent/50` → 파랑 시맨틱 복원
- 초기 치환은 `bg-accent/50`이었으나 리뷰에서 "다크모드에서 hover 상태와 구분 불가"로 지적
- 원본은 `bg-blue-50/40` → 파랑이 "읽지 않음" 시맨틱. 복원 방식으로 `bg-blue-50/60 dark:bg-blue-950/30` 양쪽 모드에 명시
- `hover:bg-accent`와 시각 언어가 달라져 구분 명확(파란 배경 + 회색 hover)

### 점진 전환 원칙의 실전 검증 — 이번에도 유효
- ADR-029에서 세운 "토큰이 바뀌어도 기존 Tailwind 유틸리티는 계속 동작" 원칙 덕에, 청크 3-d에서 sidebar를 스킵해도 라이트/다크 어느 쪽도 깨지지 않음
- 이 원칙 없었다면 sidebar까지 이번 청크에 묶어야 했고 범위/리스크가 커졌음

## Known Issues

### 이번 세션 신규 (경미)
- **알림 드롭다운의 read/unread 구분 시각 검증 미완료** — 새 `bg-blue-50/60 dark:bg-blue-950/30` 조합이 의도한 대로 보이는지 실기 확인 필요
- **success 버튼 호버 대비(다크)** — `emerald-400` + white = ~2:1, WCAG AA 미달. 현재 유지, 향후 조정 여지

### 이번 세션과 무관 (이월)
- BurndownChart 와이드 데스크톱(2000px+) 640px 캡 — 무영향
- `@tailwindcss/typography` 플러그인 부재 — 의도적
- lucide-react 1.8.0 버전 출처 — 공식 fork 여부 미확인
- stash `stash@{0}: WIP on main: 75e6aa5 Vercel 빌드 수정: prisma generate 추가, seed.ts 타입체크 제외` — 오래된 WIP stash, 현재 무관(세션과 무관하게 존재)

## Context for Next Session

**사용자 원래 의도(청크 3)**: 6부 HANDOFF의 "다음 세션 진입 가이드"대로 1 → 3 → 2 → 4 순서(다크모드 → success variant → AlertDialog → 토큰 치환). 사용자가 각 청크마다 "바로 착수" 리드 → 한 세션에 모두 완주.

**다음 세션 진입 가이드**:

1. **실기 검증 (다크모드 왕복)** — `pnpm dev`로 로그인 후 토글을 눌러 전체 페이지 순회. 우선순위:
   - 대시보드 → 프로젝트 목록 → 프로젝트 메인(필터/저장된 필터 Popover) → 칸반 보드(ambient 색상이 다크에서 어떻게 보이는지) → 이슈 상세(긴 페이지, 가장 많은 토큰) → 스프린트 상세(BurndownChart + success 버튼) → 알림 드롭다운 → 첨부 리스트 → 로그인(standalone) → 설정 페이지 × 2
   - 한글 폰트 렌더링(다크 배경에서 `Noto Sans KR` 가독성)도 같이 확인
2. **원격 푸시** — 로컬 커밋 5개(3-a/b/c/d + /handoff) 일괄 푸시. 이전 세션에서 **askpass 이슈**로 `git -c credential.helper='!gh auth git-credential' push` 회피책을 사용. memory/`git_push_credential_helper.md` 참조
3. **성능/접근성 스냅샷** (선택) — Lighthouse 라이트/다크 양쪽 스코어 비교. 특히 contrast 경고가 어디에 뜨는지 확인(success 호버 상태, badge tonal variants)
4. **후속 여유 작업**:
   - lucide-react 1.8.0 출처 재확인
   - `bg-emerald-600/500` 하드코딩을 `--success` 시맨틱 토큰으로 승격(사용처 2곳 이상 되면)
   - sidebar에 라이트 테마 대응이 필요하면 `--sidebar-*` 토큰 추가(현재는 불필요)

**사용자 선호/작업 패턴(유지)**:
- 탐색형 질문은 3안 + 추천 + 트레이드오프 포맷
- /ted-run 파이프라인 + 청크 단위 쪼개기(각 청크 빌드/리뷰/커밋/사용자 승인 후 푸시)
- **커밋과 푸시는 별개 명령** — 푸시는 명시 요청 시에만
- 커밋 메시지 한글
- HIGH 리뷰 지적은 해당 청크 안에서 즉시 수정, MEDIUM은 근거 있으면 기록만
- 후속 작업 착수 전 `git grep`으로 실제 사용처 재확인(이번 세션에서 효과 입증)

## Files Modified This Session

```
 src/app/layout.tsx                              |   1 +  (suppressHydrationWarning)
 src/components/providers.tsx                    |  16 +-  (ThemeProvider)
 src/components/common/theme-toggle.tsx          |  37 +   (new)
 src/components/ui/alert-dialog.tsx              | 160 +   (new)
 src/components/ui/button.tsx                    |   2 +   (success variant)
 src/components/layout/header.tsx                |  18 +-
 src/components/layout/project-tabs.tsx          |   4 +-
 src/components/layout/main-layout.tsx           |   4 +-
 src/components/common/notification-dropdown.tsx |  24 +-
 src/components/common/attachment-list.tsx       |  90 +-  (AlertDialog + 토큰)
 src/app/projects/[projectKey]/sprints/[sprintId]/page.tsx | 50 +-  (AlertDialog + success)
 package.json / pnpm-lock.yaml                   | + next-themes, + @radix-ui/react-alert-dialog
 CHANGELOG.md / HANDOFF.md / docs/ADR.md         | (this /handoff)
```

## Recent Commits

```
5211ab0  feat: 레이아웃/공통 컴포넌트 하드코딩 색 → 토큰 치환 (청크 3-d)
abc3a8a  feat: window.confirm() → shadcn AlertDialog 교체 (청크 3-c)
eb372e1  feat: Button success variant + 스프린트 완료 버튼 치환 (청크 3-b)
651f9f4  feat: 다크모드 토글 도입 (청크 3-a)
311df9d  docs: /handoff 2026-04-24 — 청크 2(남은 페이지 shadcn 전환) 완료 기록
b9d8368  feat: 배포/스프린트 페이지 shadcn 전환 (청크 2-c)
010f491  feat: 로그인/전역 설정/프로젝트 설정 shadcn 전환 (청크 2-b)
79a3b50  feat: 대시보드/프로젝트 목록/이슈 메인 shadcn 전환 (청크 2-a)
0b8121a  docs: /handoff 2026-04-23 5부 — shadcn 도입 + 칸반 모션 + 이슈 페이지 전환
6fda696  feat: 이슈 상세/생성/댓글 페이지 shadcn UI 전환
```

## Production Deployment

- 로컬 4개 커밋 + 이 /handoff 커밋을 **아직 푸시하지 않음** — 사용자가 명시적으로 "푸시" 지시할 때 실행
- 프로덕션 URL: https://devtracker-dusky.vercel.app
