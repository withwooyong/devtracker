# Session Handoff

> Last updated: 2026-04-23 (KST, /handoff)
> Branch: `main`
> Latest commit: `e6dec5c` — chore: Vercel 자동 배포 재연동 검증
> Production: https://devtracker-dusky.vercel.app
> 최신 배포: 자동 트리거 `devtracker-39lry4hmy` Ready (57s, `e6dec5c` 기준)

## Current Status

**✅ Vercel ↔ GitHub 자동 배포 재연동 완료, Cursor 터미널 push 401 영구 해결.** `vercel git connect`로 GitHub 연결 복구, 빈 커밋 `e6dec5c` 푸시로 자동 Production 배포 트리거 검증. 푸시 중 401이 터져 원인 규명했는데, 기존 HANDOFF의 추측(AWS CodeCommit credential helper 충돌)과 달리 **Cursor IDE가 주입하는 `GIT_ASKPASS` + `VSCODE_GIT_ASKPASS_*` 환경변수**가 `credential.https://github.com.helper`(gh) 체인을 우회하던 것. `~/.claude/settings.json`(사용자 전역, 저장소 외부)의 `env`에 해당 4개 키를 빈 문자열로 override해 Claude Code 세션 한정 영구 해결. AWS CodeCommit 설정은 호스트별 헬퍼로 유지되어 회사 프로젝트에 영향 없음. **다음 작업은 토스트 UI(sonner) 도입 — 계획만 합의, 코드 변경 없음.**

## Completed This Session (2026-04-23)

| # | Task | Commit / 위치 |
|---|------|---------------|
| 1 | 진단: `vercel project inspect devtracker` 출력에 Git 섹션 없음 → GitHub 연결 끊김 확인 | — |
| 2 | `vercel git connect https://github.com/withwooyong/devtracker.git` → `Connected` | Vercel 외부 |
| 3 | 빈 커밋 생성 후 `git push origin main` 시도 → 401 (Cursor askpass IPC 실패) | `e6dec5c` 로컬 |
| 4 | 일회성 우회 `git -c credential.helper='!gh auth git-credential' push` → 성공 | `e6dec5c` origin 반영 |
| 5 | 자동 배포 트리거 확인: `devtracker-39lry4hmy` Building 26s → Ready 57s | Vercel 배포 |
| 6 | 401 원인 재조사: `env | grep ASKPASS`로 Cursor가 `GIT_ASKPASS` + `VSCODE_GIT_ASKPASS_{NODE,MAIN,EXTRA_ARGS}` 주입 확인. `git config --global --get-regexp '^credential'`로 gh 헬퍼는 이미 github.com 스코프로 등록돼 있음 확인 → 초기 진단(AWS 헬퍼 탓) 번복 | — |
| 7 | `~/.claude/settings.json` `env`에 askpass 4개 키 빈 문자열 override 추가 | 저장소 외부 |
| 8 | 메모리 2건 저장 (Vercel 재연동 완료 / Cursor askpass 우회 — 오진 기록 포함) | `~/.claude/projects/...-devtracker/memory/` |
| 9 | 토스트 UI 방향 합의: **sonner** 채택. 2커밋 범위(Provider 추가 → 핵심 mutation onError 연결) 초안 합의 — 구현 시작 전 | — |

## Recent Commits

```
e6dec5c  chore: Vercel 자동 배포 재연동 검증
9fcd299  /handoff: 13-3차~13-7차 CHANGELOG/HANDOFF + ADR-027/028 + user-guide 답글 섹션
21e764f  chore: seed/테스트 안내의 하드코딩 "Ted"를 "허우용"으로 정정
5dc4c98  feat: UserAvatar + 이슈 상세 페이지 가독성 개선
60a2e40  feat: 댓글 대댓글 1-depth 구조 (스키마 + API + 트리 UI + 알림)
```

## Key Decisions

### Vercel ↔ GitHub 재연동은 CLI 원커맨드로 충분
- `vercel git connect <repo-url>`만 필요. 웹 대시보드 접속 없이 링크 성사됨
- 검증은 빈 커밋 + push만으로 확인 가능 (`vercel ls devtracker` 1행의 age·status·username 조합)
- 주의: `vercel project inspect`의 텍스트 출력은 Git 섹션을 표시하지 않음(CLI 렌더 한계). 실제 동작 여부는 push-trigger로만 검증 가능

### Cursor 터미널 push 401의 진짜 원인과 영구 해결 (ADR 후보)
- Cursor IDE는 내장 터미널을 띄울 때 `GIT_ASKPASS=/Applications/Cursor.app/.../askpass.sh` + `VSCODE_GIT_ASKPASS_*` 3개를 주입. 이 askpass는 Cursor GUI IPC로 자격증명을 받으려 하는데 Claude Code 헤드리스 컨텍스트에서는 응답 없음 → 401
- **오진 주의**: 사용자는 회사 프로젝트에 AWS CodeCommit을 쓰기 때문에 `credential.helper`가 전역으로 `!aws codecommit credential-helper $@`로 잡혀 있음. 이 전역값이 문제라고 착각하기 쉬우나, 사용자 머신엔 이미 `gh auth setup-git`이 실행돼 `credential.https://github.com.helper !gh auth git-credential`이 호스트 스코프로 등록돼 있음. AWS 설정 건드릴 필요 없음
- **해결**: `~/.claude/settings.json` `env`에 askpass 4개를 빈 값으로 override. Claude Code 세션에만 적용되므로 Cursor GUI의 git 기능(커밋 버튼 등) 영향 없음
- **적용 효과는 신규 세션부터**: env는 세션 시작 시에만 로드됨. 현 세션에서 재검증 불가

### 토스트 라이브러리: sonner 채택
- shadcn 친화 + Next.js 16/React 19 호환 + richColors/closeButton 기본 제공
- `<Toaster position="bottom-right" richColors closeButton />`를 `providers.tsx`에 마운트 예정
- 첫 배선 대상은 `boardMutation.onError` (실패 인지 수단 현재 없음), 이어서 `attachment-list`/`settings` 페이지의 `setError` 인라인 렌더를 토스트로 이관

## Known Issues

### 이번 세션 신규

- **현 세션에서는 Cursor askpass 영구 해결 검증 불가** — env는 세션 시작 시 주입되므로 **다음 새 Claude Code 세션**에서 `echo $GIT_ASKPASS`가 빈 문자열이고 우회 플래그 없이 `git push`가 성공하는지 확인 필요
- **CHANGELOG/HANDOFF와 메모리 2건 정정 완료** — 초기 응답에서 AWS 헬퍼 탓으로 오진한 기록이 메모리와 대화 로그에 남아 있을 수 있음. `git_push_credential_helper.md`에 정정본 저장됨

### 기존 이슈 (유지)

- **이슈 상세 편집 모드는 여전히 `<textarea>` 사용** — new 경로(RichEditor)와 불일치. HTML 원본 raw 편집
- **모바일 댓글 들여쓰기 `ml-10` 과다** — 좁은 화면에서 답글 영역 압박. `ml-6 md:ml-10` 조정 여지
- **다른 페이지 아바타 `UserAvatar` 미적용** — 사이드바/헤더/notification-dropdown 등 일괄 교체 여지
- **탭 터치 타겟 `py-2` 미적용** — 접근성 전용 커밋에서 일괄 처리
- **ARIA tablist/radiogroup 완전 구현 미실시** — roving tabindex + 화살표 키
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현**
- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안에서도 `useSortable` 실행. 현 규모 무영향
- **모바일 칸반 카드 순서 조정 미지원** (ADR-026 후속)
- **`boardMutation.onError` 토스트 UI 없음** — `r.ok` 체크로 surface 되지만 토스트/인라인 메시지 미구현 (**다음 세션 착수 예정**)
- **모바일 상태 select optimistic UI 없음** (데스크톱 DnD는 13-3차 해결)
- **`label.color` hex 무검증 `style` 인라인** / **`JSON.parse(f.filters)` try-catch 누락**
- **이슈 상세 `data!.issue.id` non-null** / **`commentMutation`의 `data?.issue?.id`**
- **deployments fetch `r.ok` 체크 누락** / **`environment` 타입 `string`** (`DeployEnvironment` 아님)
- **`window.confirm()` 사용** — iOS WKWebView 차단 가능
- **BurndownChart 모바일 텍스트 가독성** — viewBox 축소 시 ≈6px
- **e2e 선택자 견고성** — `data-testid` 부여 권장
- **기존**: Outbox inline drain fire-and-forget, 첨부 Vercel 함수 경유, Prisma CLI `libsql://` 미지원, JWT role DB 미동기, 프로젝트 멤버십 미검증, 관리자용 사용자 매핑 화면 없음, push 이벤트 rate limit 없음
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 무관

## Pending Improvements

- [ ] **토스트 UI (sonner) 도입** — **다음 세션 최우선**. (1) `pnpm add sonner` + `providers.tsx`에 `<Toaster />` (2) `boardMutation.onError`에 `toast.error` (3) `attachment-list`/`settings` 페이지 `setError` 인라인 → 토스트 이관
- [ ] **접근성 전용 커밋 (누적)** — 탭 `py-2` + ARIA tablist roving tabindex + 팝오버 외부 클릭 + `window.confirm()` 교체(토스트 Provider 재활용) + BurndownChart 가독성
- [ ] **이슈 상세 편집 모드 RichEditor 전환** — 현재 textarea로 HTML raw 편집
- [ ] **댓글/답글 입력도 RichEditor 적용** — 설명과 일관성
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
- [x] ~~Vercel ↔ GitHub 자동 배포 재연동~~ (`vercel git connect`, `e6dec5c`)
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

- **사용자 원본 의도**: 여러 후보(접근성 커밋 / 자동 배포 재연동 / 토스트 UI) 중 우선순위 합의. 재연동을 먼저 처리해 이후 모든 커밋이 자동 배포 복리 효과를 받도록 결정 → 실행 → 검증 완료
- **다음 세션 우선순위**: **(1) 토스트 UI(sonner) 도입** — 범위 작음(2커밋), boardMutation.onError의 유일한 남은 조각 + 접근성 커밋의 `window.confirm` 교체에서 재활용. **(2) 접근성 전용 커밋** — 범위 큼, 전용 세션 권장
- **토스트 구현 초안 (합의된 스코프)**:
  - 커밋 1: `pnpm add sonner` → `src/components/providers.tsx`에 `<Toaster position="bottom-right" richColors closeButton />` 추가
  - 커밋 2: `src/app/projects/[projectKey]/board/page.tsx` `boardMutation.onError`에 `toast.error("칸반 순서 저장에 실패했습니다. 다시 시도해 주세요.")`. 이어서 `attachment-list.tsx`(2곳), `settings/page.tsx`, `projects/[projectKey]/settings/page.tsx`의 `setError(err.message)` → `toast.error(err.message)`로 이관. sprint 페이지는 폼 상단 배너 UX라 범위 제외
  - 성공 토스트(`toast.success`)는 3번째 커밋에서 별도 판단 (범위 증가 우려로 에러 먼저)
- **환경 메모**: Cursor 터미널에서 새 Claude Code 세션을 시작하면 `GIT_ASKPASS`가 빈 문자열로 로드되어 `git push origin main`이 우회 플래그 없이 바로 성공해야 함. 만약 다시 401이면 세션 재시작 시점·env 로드 확인
- **사용자(허우용=Ted) 선호**: /ted-run 파이프라인(구현 → 리뷰 → 빌드 → HANDOFF/커밋). **push·프로덕션 배포는 명시 요청 시에만** (글로벌 CLAUDE.md 규칙). 커밋 메시지 한글. 비가역 작업(Turso 스키마 변경 등)은 사전 승인
- **푸시 상태**: 모든 커밋 `origin/main` 반영 완료 (`e6dec5c` 포함)
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
- **E2E 전체**: `pnpm dev &` 후 `npx playwright test` (양쪽 프로젝트 chromium + mobile-chrome)
- **E2E 모바일만**: `npx playwright test --project=mobile-chrome`
- **E2E 데스크톱 회귀**: `npx playwright test --project=chromium`
- **Vercel 자동 배포**: `git push origin main` — GitHub 연결됨. 이전의 `vercel --prod --yes` 수동 실행 불필요
- **Vercel 수동 재배포** (자동 트리거 실패 시 fallback): `vercel --prod --yes`
- **Vercel 로그 조회 (과거)**: `vercel logs https://devtracker-dusky.vercel.app --no-follow --since=30m --status-code=500 --expand`
- **Vercel 로그 조회 (실시간 스트림)**: `vercel logs https://devtracker-dusky.vercel.app` (5분 후 자동 종료)
- **Webhook 이벤트 구독**: GitHub repo → Settings → Webhooks → `Pushes`, `Pull requests`
- **프로젝트 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리" `owner/repo`
- **프로젝트별 webhook secret**: 같은 페이지 "Webhook Secret" 16자 이상
- **본인 GitHub 계정 연결**: 사이드바 "내 프로필" → GitHub 로그인
- **커밋 메시지에 이슈 링크**: `DEV-123` 형식. push는 링크만, PR merge는 이슈 DONE
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Claude Code 개인 설정**: `.claude/settings.local.json`(gitignored)
- **Cursor 터미널 push 401 fallback**: 신규 세션에서도 401이 재발하면 `git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main`
- **모바일 수동 확인**: iPhone SE 375×667 / Galaxy 360×780 / iPad 768 / 데스크톱 1440

## Files Modified This Session

```
CHANGELOG.md                                   | +20 (2026-04-23 섹션 prepend)
HANDOFF.md                                     | (전면 개편)

# 저장소 외부 (참고용 기록)
~/.claude/settings.json                        | env에 GIT_ASKPASS + VSCODE_GIT_ASKPASS_* 4개 빈 값 추가
~/.claude/projects/...-devtracker/memory/
  ├─ MEMORY.md                                 | 신규
  ├─ vercel_github_auto_deploy.md              | 신규
  └─ git_push_credential_helper.md             | 신규 (오진 정정 포함)
```
