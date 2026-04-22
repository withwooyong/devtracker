# Session Handoff

> Last updated: 2026-04-22 (KST, 13-2차 세션 후속 + /handoff)
> Branch: `main`
> Latest commit: `dcfdf33` — debug: board PATCH catch 블록에 console.error 추가
> Production: https://devtracker-dusky.vercel.app
> 최신 배포: `dpl_HdTN32RKEdVFe7chHKBW4WPSYG33` (READY)

## Current Status

**⚠️ 칸반 보드 드래그 500 이슈 진단 중 — 미해결**. 모바일 반응형 9 Phase(`f45dc57..955a696`)는 완료·푸시·프로덕션 배포까지 끝난 상태이나, 배포 후 데스크톱 칸반에서 카드 드래그 시 `PATCH /api/projects/[projectId]/board` → **500 Internal Server Error**가 재현됨. 클라이언트 DnD는 정상(grab 커서 + DragOverlay 표시 OK), 서버 쪽 응답만 실패해 re-fetch 후 카드가 원위치로 돌아가는 증상. catch 블록이 에러를 삼켜 Vercel 로그에 원인이 안 남았기 때문에 로깅 1줄(`console.error("[board PATCH]", error)`) 추가 패치 `dcfdf33` 커밋·푸시·재배포 완료. 사용자 재현 대기 중.

## Completed This Session (2026-04-22, 13-2차 후속)

| # | Task | 커밋 |
|---|------|------|
| 1 | 프로덕션 Vercel 자동 배포가 트리거 안 된 상황을 `vercel ls`로 확인 → `vercel --prod --yes`로 수동 재배포 (dpl_DNYMTAZE8xCVHhKbvzJRjeJq7vj7) | — |
| 2 | 사용자 제보: 칸반 드래그로 상태 이동 안 됨. 코드·네트워크 분석으로 "클라이언트 OK, 서버 500" 확정 | — |
| 3 | `board/route.ts` catch 블록에 `console.error("[board PATCH]", error)` 추가 | `dcfdf33` |
| 4 | `dcfdf33` 커밋·푸시·재배포(`dpl_HdTN32RKEdVFe7chHKBW4WPSYG33`) 완료. 실제 500 스택은 사용자 재현 후 `vercel logs --status-code=500 --expand`로 수집 예정 | — |

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
dcfdf33  debug: board PATCH catch 블록에 console.error 추가
955a696  /handoff: 모바일 반응형 9 Phase CHANGELOG/HANDOFF + e2e 가이드 73개
7ed3bdf  모바일 반응형 Phase 9: Playwright 모바일 프로젝트 + 스모크 스펙 4종
644f22c  모바일 반응형 Phase 8: 로그인/프로젝트 목록/에러 페이지 정돈
3371ca6  모바일 반응형 Phase 7-b: 스프린트 상세 + burndown 차트 반응형
5dcdd0f  모바일 반응형 Phase 7-a: 배포/스프린트/설정 정돈 + h1 suffix 일괄 제거
1909ff7  모바일 반응형 Phase 6: 칸반 보드 DnD 대신 상태 pill + 카드 select
aa0dae7  모바일 반응형 Phase 5: 이슈 상세 페이지 1열 전환
d858091  모바일 반응형 Phase 4: 이슈 목록 카드 뷰 + 필터 바 세로 스택
b4277b2  모바일 반응형 Phase 3: ProjectTabs 공통화 + 헤더 wrapper 반응형
```

## Key Decisions

### 모바일 반응형 9 Phase (완료, 13차)
- **CSS 분기 > JS 분기** (ADR-026): `useMediaQuery`로 조건부 렌더 대신 `md:hidden` / `hidden md:block` 두 블록 공존. SSR 플래시·DnDContext 재마운트·테스트 안정성 모두 해결
- **모바일 칸반 = 상태 변경, DnD ≠ 본질**: 드래그는 데스크톱 표현 방식. 모바일은 `<select>` + `handleMobileStatusChange`로 기존 `boardMutation` 재사용
- **ARIA 선언만 ≠ 동작 완성**: role+aria-selected를 붙였다가 roving tabindex + 화살표 키 핸들러 없이는 AT에 혼란 → 제거 (Phase 5·6 일관)
- **h1은 프로젝트 이름만, 페이지는 탭이 식별** (Phase 7-a)

### 칸반 드래그 500 진단 (진행 중, 13-2차)
- **로깅 우선**: 추정 수정 대신 `console.error` 1줄 패치로 실제 스택부터 확보 → 원인 확정 후 진짜 수정. 삽질 방지
- **Vercel 자동 배포 미트리거** 대응: `vercel --prod --yes` 수동 배포가 표준 우회로. runbook에 기재됨

## Known Issues

### 🚨 긴급 — 칸반 드래그 500 (미해결, 다음 세션 최우선)

- **증상**: 프로덕션 칸반에서 카드 드래그 후 드롭 → `PATCH /api/projects/[projectId]/board` 응답 500 → `onSuccess` 미발동 → `invalidateQueries` 후 원 데이터 유지되어 카드가 원위치 복귀
- **클라이언트**: 정상 작동 확인됨 (커서 `grab`, DragOverlay 표시, DnD dispatch OK)
- **서버 catch**: `dcfdf33` 이후 `console.error("[board PATCH]", error)`로 Vercel Function 로그에 스택 노출됨
- **다음 액션**:
  1. 사용자가 프로덕션(https://devtracker-dusky.vercel.app)에서 칸반 드래그 1회 재현
  2. `vercel logs https://devtracker-dusky.vercel.app --no-follow --since=30m --status-code=500 --expand`로 스택 포착
  3. 원인 확정 후 진짜 수정 커밋
- **예상 원인 후보** (미확정, 로그 확인 전):
  1. Turso(libSQL) + Prisma 7의 `$transaction([...updates])` 호환성 — batch transaction 지원 제약
  2. Vercel Function 10초 타임아웃 — items 100개 직렬 update 시 네트워크 RTT 누적
  3. 스키마 드리프트 — 최근 Turso에 `kanbanOrder`/`status` 컬럼 상태 mismatch
  4. `prisma.issue.update` N+1 — 단일 transaction으로 실행해도 libSQL 드라이버가 직렬화
- **수정 방향 (로그 확인 후)**:
  - 트랜잭션 호환성 문제면 `prisma.$transaction(async (tx) => ...)` 인터랙티브 방식 또는 raw SQL 단일 문 (`UPDATE ... SET ... WHERE id IN (CASE ...)`)로 교체
  - 타임아웃 문제면 변경분만 업데이트(이동된 이슈 + 영향받는 `kanbanOrder`만)로 최적화

### 기존 이슈 (유지)

- **탭 터치 타겟 `py-2` 미적용** — 접근성 전용 커밋에서 일괄 처리
- **ARIA tablist/radiogroup 완전 구현 미실시** — roving tabindex + 화살표 키
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현**
- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안에서도 `useSortable` 실행. 현재 규모 무영향
- **모바일 칸반 카드 순서 조정 미지원** (ADR-026 후속)
- **`boardMutation.onError` 피드백 없음** — 토스트/인라인 메시지
- **상태 select optimistic UI 없음**
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

- [ ] **🔥 칸반 드래그 500 진짜 수정** (로그 확인 후) — 위 "긴급" 참조
- [ ] **Vercel ↔ GitHub 자동 배포 재연동** — 매번 수동 배포는 지속 불가능
- [ ] **접근성 전용 커밋 (누적)** — 탭 터치 타겟 `py-2` + ARIA tablist 완전 + 팝오버 외부 클릭
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
- [ ] 상태 select optimistic UI + `boardMutation.onError` 피드백
- [ ] e2e `data-testid` 부여
- [x] ~~GitHub 연동 스토리~~
- [x] ~~기술 부채 정리 묶음~~ (ADR-025)
- [x] ~~모바일 반응형 9 Phase~~ (ADR-026)

## Context for Next Session

- **다음 세션 1순위**: 칸반 드래그 500 이슈 해결. 순서는
  1. https://devtracker-dusky.vercel.app 에서 드래그 1회 재현 유도
  2. `vercel logs https://devtracker-dusky.vercel.app --no-follow --since=30m --status-code=500 --expand`로 `[board PATCH]` 로그 스택 확보
  3. 스택 분석 → 원인 확정 (Turso 트랜잭션 / 타임아웃 / 스키마 드리프트 중 하나)
  4. 진짜 수정 커밋 → 재배포 → 드래그 동작 확인
  5. 디버그용 `console.error` 유지 여부 결정 (운영 로깅 관점에서 유지 추천)
- **그 다음 후보**: (a) 접근성 전용 커밋 / (b) Vercel 자동 배포 재연동 / (c) Rate limiting / (d) Slack 외부 알림 / (e) 설정 페이지 2차
- 사용자(Ted) 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드 → HANDOFF/커밋). 푸시·프로덕션 배포는 명시 요청 시. 커밋 메시지 한글
- **푸시 상태**: 모든 커밋 `origin/main` 반영 완료 (방금 `dcfdf33`까지 push 확인)
- **Co-Authored-By**: 프로젝트 `.claude/settings.local.json`에서 `includeCoAuthoredBy: true`
- Production URL: https://devtracker-dusky.vercel.app
- 최신 배포: `dpl_HdTN32RKEdVFe7chHKBW4WPSYG33` (production, READY)
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
