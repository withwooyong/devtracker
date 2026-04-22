# Session Handoff

> Last updated: 2026-04-22 (KST, 13차 세션 + /handoff)
> Branch: `main`
> Latest commit: `7ed3bdf` — 모바일 반응형 Phase 9: Playwright 모바일 프로젝트 + 스모크 스펙 4종
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + Outbox Transactional + webhook 하이브리드(ADR-020) + 프로젝트별 secret(ADR-021) + 사용자 매핑(ADR-022) + push(ADR-023) + 타입 배지 UI(ADR-024) + 기술 부채(ADR-025)에 이어, 이번 세션은 **모바일 반응형 9 Phase**(ADR-026). 계획서 `docs/plan/mobile-responsive-plan.md` 기반으로 레이아웃 셸 → ProjectTabs → 이슈 목록/상세 → 칸반 → 배포·스프린트·설정 → 로그인·에러 → e2e 순으로 9커밋 분할 구현. `IssueCard`/`MobileKanbanCard`/`ProjectTabs`/`useMediaQuery`/`useUIStore` 신규. ADR-026(칸반 모바일 대체)·Journey 16(Pixel 5 스모크 4). 전 페이지 375px 가로 스크롤 없음, 데스크톱 회귀 없음. tsc/lint/build 클린. /handoff 전 9커밋 완료.

## Completed This Session (2026-04-22, 13차)

| Phase | 커밋 | 주요 변경 |
|-------|------|----------|
| 1~2 | `f45dc57` | `viewport` 메타 + `useUIStore`/`useMediaQuery`, 사이드바 드로어화(`role="dialog"`, `inert`, Esc, opener 포커스 복귀), 헤더 햄버거 + `data-sidebar-trigger`, breadcrumb truncate, 본문 `p-4 md:p-6` |
| 3 | `b4277b2` | `ProjectTabs` 공통화(5페이지 × 32줄 중복 → 1줄 치환, 순감 97줄). 헤더 wrapper `min-w-0 flex-1 truncate` |
| 4 | `d858091` | `IssueCard` 신규. 이슈 목록 필터 바 `flex-col md:flex-row`, 테이블 `hidden md:block` + 모바일 카드 `md:hidden`. 저장된 필터 팝오버 풀폭화, relative 부모 `w-full md:w-auto` |
| 5 | `aa0dae7` | 이슈 상세 `grid-cols-3` → `flex-col lg:grid lg:grid-cols-3`. 댓글 탭 바 `overflow-x-auto`, 제목/설명/댓글 3곳 `break-words` |
| 6 | `1909ff7` | **ADR-026**. 칸반 모바일: 상태 pill 4개 + `MobileKanbanCard` + 카드 `<select>`로 상태 변경. 데스크톱 DnD 완전 보존. CSS 분기(`md:hidden`/`hidden md:block`) |
| 7-a | `5dcdd0f` | h1 페이지 suffix 일괄 제거(3곳). 배포 이력 카드 `flex-col sm:flex-row`, 환경 필터 가로 스크롤, 생성 폼 `grid-cols-1 sm:grid-cols-2` |
| 7-b | `3371ca6` | 스프린트 상세 헤더·버튼 그룹·이슈 리스트 세로 스택 재편 |
| 8 | `644f22c` | 로그인 외곽 `px-4 py-6`, 프로젝트 목록 카드 재편, not-found/error `px-4` + error `max-w-md break-words` |
| 9 | `7ed3bdf` | `playwright.config.ts` 2 프로젝트 분리(chromium/mobile-chrome). `tests/e2e/mobile-responsive.spec.ts` 4 스모크(드로어/카드 뷰/상태 pill/탭) |

### 직전 세션들

- **12차** (`9ad4409` + `76eabe2`): 기술 부채 정리 묶음 ADR-025 — 타입 가드·UUID 파싱·상수시간 비교·aria-label 통합
- **11차** (`db5357e` + `b5f7dc8`): GitHubLink 타입 배지 UI — PR/커밋/브랜치 컬러 pill + ID 힌트, Journey 15 × 2
- **10차** (`ed41bdd` + `62eddc6`): GitHub push 이벤트 지원 — `handlePush()`, Journey 14/14b × 6
- **9차** (`8af8a94` + `aafcce9`): GitHub 사용자 매핑 — `PATCH /api/auth/me`, `resolvePullRequestAuthor()`, Journey 13 × 6
- **8차** (`812e2fa` + `69a09dc`): 프로젝트별 webhook secret

## Recent Commits

```
7ed3bdf  모바일 반응형 Phase 9: Playwright 모바일 프로젝트 + 스모크 스펙 4종
644f22c  모바일 반응형 Phase 8: 로그인/프로젝트 목록/에러 페이지 정돈
3371ca6  모바일 반응형 Phase 7-b: 스프린트 상세 + burndown 차트 반응형
5dcdd0f  모바일 반응형 Phase 7-a: 배포/스프린트/설정 정돈 + h1 suffix 일괄 제거
1909ff7  모바일 반응형 Phase 6: 칸반 보드 DnD 대신 상태 pill + 카드 select
aa0dae7  모바일 반응형 Phase 5: 이슈 상세 페이지 1열 전환
d858091  모바일 반응형 Phase 4: 이슈 목록 카드 뷰 + 필터 바 세로 스택
b4277b2  모바일 반응형 Phase 3: ProjectTabs 공통화 + 헤더 wrapper 반응형
f45dc57  모바일 반응형 Phase 1~2: 레이아웃 셸 드로어화
76eabe2  /handoff: 기술 부채 정리 CHANGELOG/HANDOFF + ADR-025 + e2e 가이드 69개
```

## Key Decisions

- **CSS 분기 > JS 분기** (ADR-026): `useMediaQuery`로 `isDesktop ? <Dnd/> : <Mobile/>`는 초기 렌더 플래시 + DndContext 재마운트 문제. `md:hidden` / `hidden md:block` 두 블록을 모두 DOM에 두고 display로만 제어 → SSR 일관성 + 테스트 안정성 + 리플로우 예측 가능. 대가는 비가시 트리의 `useSortable` 훅 N개 유지(현재 규모 감지 불가).
- **모바일 칸반 = 상태 변경, DnD ≠ 본질**: 드래그는 데스크톱 표현 방식이고 본질은 "이슈 상태 전환". 모바일에서는 카드 내부 `<select>`가 정확·빠름. 네이티브 picker로 접근성 자동 지원(iOS/Android). 기존 `boardMutation`을 재사용해 updates 배열 일관성(소스/타겟 컬럼 모두 `kanbanOrder` 재부여) 유지 — 데스크톱과 DB 무결성 동일.
- **ARIA는 선언만 ≠ 동작 완성**: Phase 5 이슈 상세 탭에 `role="tablist"` + `aria-selected`를 선언했다가, roving tabindex + 화살표 키 핸들러 없이는 AT에 오히려 혼란이라 판단해 제거. Phase 6 칸반 상태 pill도 동일 원칙으로 role 없이 단순 button 그룹 + 시각 상태로 전달. 완전한 tablist 패턴은 접근성 전용 커밋에서 별도 처리.
- **h1은 프로젝트 이름만, 페이지 식별은 탭이 담당**: "- 칸반 보드"/"- 배포 이력"/" 설정" suffix는 활성 탭과 중복. 긴 프로젝트명 + suffix + `truncate` 조합은 suffix가 잘려 오히려 혼란. 삭제로 정보 중복 제거 + 공간 확보.
- **접근성 패턴 일괄 도입**: 드로어 `role="dialog"`/`aria-modal`, Esc 닫기, 메인 `inert`로 배경 포커스 격리, 닫힘 시 opener로 포커스 복귀. 첫 링크 auto-focus. 햄버거 버튼 `data-sidebar-trigger` + 쿼리 셀렉터로 opener 식별.

## Known Issues

- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안의 `KanbanColumn`/`KanbanCard`에서 `useSortable` 훅이 모바일에서도 실행. `activationConstraint: { distance: 5 }` + hidden 요소에 pointer event 미도달로 오발화 없음. 현재 규모(limit=100) 감지 불가. 수백 건 이슈 시 재검토 필요 (ADR-026 후속)
- **모바일 칸반 카드 순서 조정 미지원**: 상태 변경만 가능, 동일 컬럼 내 순서는 기존 `kanbanOrder` 기준 표시. ↑↓ 버튼 또는 long-press 도입은 실사용 피드백 후 결정 (ADR-026 후속)
- **탭 터치 타겟 `py-2` 미적용**: ProjectTabs·이슈 상세 탭 바·칸반 상태 pill에 `pb-1`만 있어 WCAG 2.5.5 24×24px AA 경계 수준. 접근성 전용 커밋에서 일괄 처리
- **ARIA tablist/radiogroup 완전 구현 미실시**: roving tabindex + 화살표 키 핸들러 + focus restoration
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현**: 모바일 풀폭 팝오버 닫기 수단 부족
- **`boardMutation.onError` 피드백 없음**: 모바일 카드 상태 변경·데스크톱 DnD 모두 해당. 토스트/인라인 메시지
- **상태 select optimistic UI 없음**: 서버 응답 후 re-fetch로 짧은 깜빡임. `onMutate` 패턴
- **`label.color` hex 무검증 `style` 인라인**: XSS 위험 낮음이나 방어적 검증 여지
- **`JSON.parse(f.filters)` try-catch 누락**: 저장된 필터 적용 시
- **이슈 상세 `data!.issue.id` non-null assertion**: `enabled` 가드로 안전하나 명시 권장
- **deployments fetch `r.ok` 체크 누락**: 4xx/5xx 시 에러 표시 부재. `environment` state 타입이 `DeployEnvironment` 아닌 `string`
- **`window.confirm()` 사용**: iOS Safari WKWebView에서 차단 가능. 인라인 확인 UI 교체 권장
- **BurndownChart 모바일 텍스트 가독성**: SVG viewBox 축소 시 `fontSize: 10`이 ≈6px. viewBox 고정 유지하되 텍스트만 상대 확대 필요
- **e2e 선택자 견고성**: `mobile-responsive.spec.ts`의 `div.hidden.md\\:block` / `div.md\\:hidden` nth-child는 현재 안전하나 향후 `data-testid` 부여 권장
- **기존**: Outbox inline drain fire-and-forget, 첨부 Vercel 함수 경유, Prisma CLI `libsql://` 미지원, JWT role DB 미동기, 프로젝트 멤버십 미검증, 관리자용 사용자 매핑 화면 없음, push 이벤트 rate limit 없음
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관

## Pending Improvements

- [ ] **접근성 전용 커밋 (누적)**: 탭 터치 타겟 `py-2`, ARIA tablist 완전 구현, 팝오버 외부 클릭 닫힘
- [ ] **Rate limiting** (알림/첨부/webhook) — Upstash Redis 또는 Vercel Edge Config
- [ ] **Slack/Discord 외부 알림 통합** — Outbox 확장 재사용
- [ ] **설정 페이지 2차** — name 편집, 삭제 파괴적 영역 분리, 관리자용 사용자 매핑 화면
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] Webhook secret 로테이션 감사 로그
- [ ] Orphan blob cleanup 배치
- [ ] push 이벤트 rate limit
- [ ] `handlePush` 이슈 조회 N+1 개선 (findMany 일괄)
- [ ] `GITHUB_LINK_TYPE_VALUES`/`_STATUS_VALUES` export (폼/zod 공유 대비)
- [ ] 이슈 상세 `data!` non-null 제거, `commentMutation`의 `issue.id` 직접 사용
- [ ] deployments fetch `r.ok` + `environment` 타입 `DeployEnvironment`
- [ ] `window.confirm()` 인라인 확인 UI 교체
- [ ] BurndownChart 모바일 텍스트 가독성 (fontSize 상대 확대)
- [ ] 칸반 모바일 카드 순서 조정 (↑↓ 버튼 또는 long-press)
- [ ] 상태 select optimistic UI + `boardMutation.onError` 피드백
- [ ] e2e `data-testid` 부여로 선택자 견고성 확보
- [x] ~~GitHub 연동 스토리(라우팅/secret/매핑/push/UI)~~
- [x] ~~기술 부채 정리 묶음~~ (ADR-025)
- [x] ~~모바일 반응형 9 Phase~~ (ADR-026, 이번 세션)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **GitHub 연동 + 기술 부채 + 모바일 반응형까지 완료**. 다음 후보:
  - (a) **접근성 전용 커밋** — 탭 터치 타겟 `py-2`, ARIA tablist roving tabindex + 화살표 키, 팝오버 외부 클릭 닫힘, Phase 5/6에서 유보된 ARIA 완성. 위 "누적" 이슈를 한 세션에 정리하고 ADR 1건
  - (b) **Rate limiting** (알림/첨부/webhook) — push 이후 webhook 표면 확장. 운영 방어. Upstash Redis
  - (c) **Slack/Discord 외부 알림 통합** — 팀 체감 큰 기능. 알림 Outbox 확장 재사용
  - (d) **설정 페이지 2차** — name 편집, 프로젝트 삭제 영역 분리, 관리자용 사용자 매핑 화면
  - (e) **문서 정리** — `docs/feature-roadmap-plan.md`가 Phase 1~3까지만. 모바일 Phase 완료 반영 + Phase 4 로드맵 작성
- 사용자 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드 → HANDOFF/커밋). 푸시는 명시 요청 시만. 커밋 메시지 한글. 이번 시리즈는 Phase별 단일 커밋 9개로 세분.
- **푸시 대기**: 9개 커밋 `f45dc57..7ed3bdf` + 이번 /handoff 커밋이 로컬에만 있음. `git push origin main` 명시 요청 시 실행
- **Co-Authored-By**: 프로젝트 `.claude/settings.local.json`에서 `includeCoAuthoredBy: true` 유지
- **e2e 실행**: 로컬 dev server + `npx playwright test` → 양쪽 프로젝트(chromium + mobile-chrome). 현 세션에서는 실행 안 함(Turso 네트워크 의존) — 사용자 환경에서 수동 검증 필요
- 작업계획서: `docs/plan/mobile-responsive-plan.md`(9 Phase 체크리스트)
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker` (webhook + Pushes/Pull requests 구독)
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Private store
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 전역 fallback secret
- `CRON_SECRET` — Vercel Cron Bearer 인증

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → `\n` 후처리 + 테스트용 secret 수동 추가
- **E2E 전체**: `pnpm dev &` 후 `npx playwright test` (양쪽 프로젝트)
- **E2E 모바일만**: `npx playwright test --project=mobile-chrome`
- **E2E 데스크톱만(회귀)**: `npx playwright test --project=chromium`
- **Vercel 재배포**: `vercel --prod --yes`
- **Webhook 이벤트 구독**: GitHub repo → Settings → Webhooks → `Pushes`, `Pull requests` 체크
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력
- **프로젝트별 webhook secret 설정**: 같은 페이지에서 "Webhook Secret" 16자 이상 입력
- **본인 GitHub 계정 연결**: 사이드바 하단 "내 프로필" → GitHub 로그인 입력
- **커밋 메시지에 이슈 링크**: `DEV-123` 형식. push는 링크만, PR merge는 이슈 DONE 전환
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Claude Code 개인 설정**: `.claude/settings.local.json`(gitignored). `includeCoAuthoredBy: true`로 이 프로젝트에서만 Co-Authored-By trailer 자동 삽입
- **모바일 수동 확인 체크리스트**: iPhone SE 375×667 / Galaxy 360×780 / iPad 768 / 데스크톱 1440 — 기기별 실사용 1회
