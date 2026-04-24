# Session Handoff

> Last updated: 2026-04-24 (KST, /handoff 6부 — 청크 2 완료)
> Branch: `main`
> Latest commit: `b9d8368` — feat: 배포/스프린트 페이지 shadcn 전환 (청크 2-c)
> Production: https://devtracker-dusky.vercel.app

## Current Status

**✅ shadcn/ui 전면 전환 사이클 완료.** 5부(청크 1, 2026-04-23)에서 인프라 + 칸반 보드 + 이슈 상세/생성을 전환했고, 이번 세션(2026-04-24)에 남은 9개 페이지(대시보드/프로젝트 목록/이슈 메인/로그인/전역 설정/프로젝트 설정/배포 목록·신규/스프린트 목록·신규·상세)를 3개 청크로 나누어 모두 처리. 이제 **앱의 모든 페이지**가 OKLCH 토큰 + shadcn 컴포넌트 기반이다. 남은 건 다크모드 토글, AlertDialog로 confirm 교체, 레이아웃/공통 컴포넌트 토큰 정리 — 모두 MEDIUM/LOW 우선순위.

## Completed This Session (2026-04-24, 청크 2 — 2-a + 2-b + 2-c)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | 청크 2-a: 대시보드 shadcn 전환 (Card hover lift + Skeleton 그리드 + 빈 상태 CTA) | `79a3b50` | `dashboard/page.tsx` |
| 2 | 청크 2-a: 프로젝트 목록 (Card + Input + Label + Button + Skeleton) | `79a3b50` | `projects/page.tsx` |
| 3 | 청크 2-a: 프로젝트 메인(이슈 목록 + 필터) — 최대 변경. Popover로 저장된 필터 드롭다운 교체, Select × 3, Input 검색, Table 데스크톱, IssueCard 모바일. filter mutation 토스트 + JSON.parse try/catch | `79a3b50` | `projects/[projectKey]/page.tsx`, `components/issues/issue-card.tsx` |
| 4 | 청크 2-a: ui 컴포넌트 추가 — Popover(`@radix-ui/react-popover`), Table | `79a3b50` | `src/components/ui/popover.tsx`, `src/components/ui/table.tsx` |
| 5 | 청크 2-b: 로그인 페이지 (standalone Card + Separator, `role="alert"` + destructive 토큰 인라인 에러, Button variant="link" 모드 토글) | `010f491` | `login/page.tsx` |
| 6 | 청크 2-b: 전역 설정 (Card + Input + Label + Button, 이메일/이름 `disabled readOnly`, Skeleton) | `010f491` | `settings/page.tsx` |
| 7 | 청크 2-b: 프로젝트 설정 (Card + Textarea + Badge 상태, 권한 없음 amber Card) + webhook secret 제거 취소 silent drop 버그 수정 | `010f491` | `projects/[projectKey]/settings/page.tsx` |
| 8 | 청크 2-c: 배포 목록 + 신규 (Card + Button env 필터, Select 환경, Textarea 변경사항, r.ok 체크 추가, Label htmlFor 연결) | `b9d8368` | `deployments/page.tsx`, `deployments/new/page.tsx` |
| 9 | 청크 2-c: 스프린트 목록 + 신규 + 상세(356줄). `SPRINT_STATUS_VARIANT` 모듈 스코프 매핑 도입, Badge `rounded-full` pill, 진행률 bar 토큰화, BurndownChart 유지 | `b9d8368` | `sprints/page.tsx`, `sprints/new/page.tsx`, `sprints/[sprintId]/page.tsx` |
| 10 | 각 청크마다 typescript-reviewer로 리뷰 → CRITICAL 0건, HIGH 9건(2-a 3건, 2-b 4건, 2-c 2건) 즉시 수정 | — | 위 파일들 |
| 11 | 각 청크 빌드 검증 전부 통과 (TS 2.3~2.7s, 18 페이지 OK) | — | — |
| 12 | 각 청크 커밋 + origin/main 푸시 + Vercel 자동 배포 | — | — |

## In Progress / Pending

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | 다크모드 토글 UI | Pending | `next-themes` 한 줄 도입 + 헤더에 토글 버튼 1개. 토큰/`.dark` variant 전부 준비됨 — 실제 UI만 추가하면 즉시 동작 |
| 2 | AlertDialog로 `window.confirm()` 교체 | Pending | 스프린트 삭제(`sprints/[sprintId]/page.tsx`)가 유일한 사용처. shadcn AlertDialog 추가 → `@radix-ui/react-alert-dialog` 의존성 1개만 필요 |
| 3 | success Button variant 추가 | Pending (LOW) | 스프린트 상세의 "스프린트 완료" 버튼이 `bg-emerald-600 text-white hover:bg-emerald-700` 인라인 — 다크모드 대응 안 됨. button.tsx cva에 `success` variant 추가 권장 |
| 4 | `components/layout/*` + `components/common/*` 토큰 치환 | Pending (LOW) | header/sidebar/project-tabs/main-layout/notification-dropdown/attachment-list/user-avatar. 미전환 상태지만 기존 Tailwind 색 유틸리티가 동작해 깨지지 않음. 다크모드 도입 시 함께 처리가 효율적 |
| 5 | `lucide-react` 1.8.0 버전 출처 재확인 | Pending (LOW) | 메이저 버전이 이례적으로 앞섬(보통 0.4xx). 공식 fork인지 점검 |

## Key Decisions Made

### Popover로 커스텀 드롭다운 교체 → B안 묶음 2 자연 해소
- `projects/[projectKey]/page.tsx`의 "저장된 필터" 드롭다운은 `showFiltersDropdown` state + 자체 클릭 핸들러로 구현돼 있었고, 외부 클릭 시 닫히지 않는 UX 이슈(B안 묶음 2)가 이월 과제였음
- shadcn **Popover**(Radix) 도입으로 pointerdown 기반 outside-click이 기본 동작 → 코드량도 감소
- 내부 delete 버튼의 `e.stopPropagation()`은 click 이벤트 기반이라 Radix의 pointerdown을 가로채지 못함 → **no-op이라 제거**. Popover는 content 내부 클릭 시 닫히지 않는 기본 동작을 그대로 유지(여러 필터를 연속 삭제하기 편함)

### `SPRINT_STATUS_VARIANT` 모듈 스코프 매핑(2-c)
- 기존 `types/sprint.ts`의 `SPRINT_STATUS_COLORS`는 하드코딩된 Tailwind 색(`bg-gray-100 text-gray-700`) → 다크모드/토큰 체계에 맞지 않음
- `sprints/page.tsx`와 `sprints/[sprintId]/page.tsx` 두 곳 모두에서 동일한 매핑 사용 → **각 파일 module scope**에 `Record<SprintStatus, BadgeVariant>` 정의. 기존 상수는 혹시 모를 다른 호출처를 위해 남겨둠
- PLANNED=slate, ACTIVE=blue, COMPLETED=emerald — shadcn Badge의 커스텀 tonal variant 체계와 일관

### webhook secret 상태 기계 버그 — 같은 청크에서 같이 수정
- 기존 코드에도 있던 버그지만 2-b 리뷰에서 HIGH로 분류. 사용자가 secret 입력 → "제거" → "제거 취소" 흐름에서 `webhookSecret` state가 잔류해 저장 시 silent drop
- 원칙상 "기존 버그는 별도 커밋" 이지만 1줄 수정(`setWebhookSecret("")`)이라 같은 청크에 묶음. 주석으로 이유 기록

### "스프린트 완료" 버튼 하드코딩 색 — 후속 처리
- Button CVA에 `success` variant가 없어 인라인 `bg-emerald-600`로 처리. 다크모드 대응은 안 됨
- 리뷰에서 MEDIUM으로 분류 → 이번엔 그대로 두고 다크모드 토글 도입 시 button.tsx에 `success` variant를 정식으로 추가하는 타이밍에 같이 처리

### 점진 전환 원칙 — 토큰이 바뀌어도 기존 유틸리티는 동작
- `globals.css`의 `@theme inline`은 토큰을 **새 유틸리티(`bg-card`, `text-foreground` 등)로 노출**하되, 기존 `bg-white`, `text-gray-900`도 계속 유효
- 덕분에 청크 간 혼재 상태에서도 빌드/동작 문제 없이 점진 전환 가능. 이번 세션에서 이 설계 덕을 톡톡히 봄 — 2-a/2-b/2-c를 각각 커밋/배포해도 중간 상태에서 미전환 페이지가 깨지지 않음

## Known Issues

### 이번 세션 신규 (경미)
- **git push askpass 이슈 재발 지속** — 이번 세션도 첫 `git push`에서 `Device not configured` 발생. 기록된 회피책(`git -c credential.helper='!gh auth git-credential' push`)으로 3건 모두 성공. memory의 `git_push_credential_helper.md` 회피책이 실전 기준. 근본 수정은 여전히 미정
- **스프린트 완료 버튼 다크모드 미대응** — `bg-emerald-600` 인라인 → 다크 배경에서 대비 애매. success variant 추가 시 해소

### 이번 세션과 무관 (이월)
- BurndownChart 와이드 데스크톱(2000px+) 640px 캡 — 현재 레이아웃에서 무영향
- `@tailwindcss/typography` 플러그인 부재 — 의도적
- 모바일 select 피커 실기 재검증 — 5부에서 shadcn Select로 교체되어 원천 차단, 사용자 실기 확인만 남음

## Context for Next Session

**사용자 원래 의도(청크 2)**: 5부 HANDOFF의 "다음 세션 진입 가이드"대로 남은 페이지 shadcn 전환 — 대시보드부터 시작. 사용자가 "2-b / 2-c 차례로 가자"로 리드해 3 청크를 세션 내에 모두 완주.

**다음 세션 진입 가이드** (우선순위 순):

1. **다크모드 토글** — 가장 가시적 개선. `pnpm add next-themes` → `app/layout.tsx`에 `<ThemeProvider>` 래핑(`attribute="class"` + `defaultTheme="system"`) → 헤더에 Sun/Moon 아이콘 토글 Button 1개. `globals.css`의 `.dark { ... }` 토큰이 자동 활성화. 이슈 상세/사이드바/amber/emerald 토큰이 많은 페이지에서 가시 검증 필요
2. **AlertDialog 도입** — `pnpm add @radix-ui/react-alert-dialog` → shadcn AlertDialog 공식 소스 복사 → `sprints/[sprintId]/page.tsx`의 삭제 `confirm()` 교체. 다른 사용처 grep: `git grep -n 'confirm('` 로 한 번 훑기
3. **success Button variant** — `src/components/ui/button.tsx`의 cva variants에 `success: "bg-emerald-600 text-primary-foreground shadow-xs hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"` 추가. 스프린트 완료 버튼에 적용
4. **레이아웃/공통 컴포넌트 토큰 치환** — 다크모드 도입 시 같이 처리하는 게 자연스러움. header/sidebar에 아바타 + 알림 드롭다운이 있어 Popover 사용 기회

**사용자 선호/작업 패턴(유지)**:
- 탐색형 질문은 3안 + 추천 + 트레이드오프 포맷
- /ted-run 파이프라인 + 청크 단위 쪼개기(각 청크 빌드/리뷰/커밋/사용자 승인 후 푸시)
- **커밋과 푸시는 별개 명령** — 푸시는 명시 요청 시에만
- 커밋 메시지 한글
- HIGH 리뷰 지적은 해당 청크 안에서 즉시 수정

## Files Modified This Session

```
 src/app/dashboard/page.tsx                                  |  99 +/-
 src/app/login/page.tsx                                      | 173 +/-
 src/app/projects/page.tsx                                   | 203 +/-
 src/app/projects/[projectKey]/page.tsx                      | 484 +/-
 src/app/projects/[projectKey]/settings/page.tsx             | 316 +/-
 src/app/projects/[projectKey]/deployments/page.tsx          | 149 +/-
 src/app/projects/[projectKey]/deployments/new/page.tsx      | 173 +/-
 src/app/projects/[projectKey]/sprints/page.tsx              | 112 +/-
 src/app/projects/[projectKey]/sprints/new/page.tsx          | 184 +/-
 src/app/projects/[projectKey]/sprints/[sprintId]/page.tsx   | 372 +/-
 src/app/settings/page.tsx                                   | 136 +/-
 src/components/issues/issue-card.tsx                        |  75 +/-
 src/components/ui/popover.tsx                               |  48 +  (new)
 src/components/ui/table.tsx                                 | 114 +  (new)
 package.json / pnpm-lock.yaml                               | + @radix-ui/react-popover
 CHANGELOG.md / HANDOFF.md / docs/ADR.md                     | (this /handoff)
```

## Recent Commits

```
b9d8368  feat: 배포/스프린트 페이지 shadcn 전환 (청크 2-c)
010f491  feat: 로그인/전역 설정/프로젝트 설정 shadcn 전환 (청크 2-b)
79a3b50  feat: 대시보드/프로젝트 목록/이슈 메인 shadcn 전환 (청크 2-a)
0b8121a  docs: /handoff 2026-04-23 5부 — shadcn 도입 + 칸반 모션 + 이슈 페이지 전환
6fda696  feat: 이슈 상세/생성/댓글 페이지 shadcn UI 전환
3423468  feat: shadcn 도입 + 칸반 보드 ambient/tilt/magnetic/skeleton 효과
3306cff  docs: /handoff 2026-04-23 4부 — 모바일 select 핫픽스 기록
043855b  fix: 모바일 칸반 상태 select 옵션 피커 표시 문제 핫픽스
609a687  docs: /handoff 2026-04-23 3부 — RichEditor 핫픽스 + B안 묶음 4 번다운 가독성
9bd97d0  fix: 번다운 차트 모바일 가독성 (font 10→18, max-w 640px)
```

## Production Deployment

- `79a3b50` · `010f491` · `b9d8368` 모두 push 시점에 Vercel 자동 배포 트리거
- 프로덕션 URL: https://devtracker-dusky.vercel.app
