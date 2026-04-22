# Session Handoff

> Last updated: 2026-04-23 (KST, /handoff)
> Branch: `main`
> Latest commit: `21e764f` — chore: seed/테스트 안내의 하드코딩 "Ted"를 "허우용"으로 정정
> Production: https://devtracker-dusky.vercel.app
> 최신 배포: `21e764f` 기준 production 배포 완료 (직전 `dpl_JANrLuG8cTNQULt6qofDGmv9PvEj`)

## Current Status

**✅ 칸반 보드 안정화 + 대댓글 구조 + UI 정비 완료**. 13-2차에서 미해결 상태로 남겼던 **칸반 드래그 500**을 13-3차에 원인 확정(libSQL RTT 누적 → P2028)하고 `$executeRaw` + `CASE WHEN` 단일 UPDATE로 근본 해결(`8a1cc2b`). 이어 반응속도/비용 튜닝(optimistic UI + r.ok + prefetch=false, `e47d976`), 같은 컬럼 순서 변경 동작(`useDroppable` + `arrayMove`, `088e565`)까지 진행. 이슈 상세 영역에서는 RichEditor 가독성(`ce3eaf4`), 댓글 대댓글 1-depth 구조(`60a2e40`), UserAvatar + 페이지 색상 상향(`5dc4c98`), seed/테스트 안내 "Ted" 하드코딩 정리(`21e764f`)까지 마무리. 주요 결정은 ADR-027/028에 기록. 커밋·푸시·재배포 모두 완료, 미커밋 변경 없음.

## Completed This Session (2026-04-22 13-3차 ~ 13-7차)

| # | Task | Commit |
|---|------|--------|
| 1 | 칸반 드래그 500 원인 확정 (`vercel logs --status-code=500 --expand` → Prisma P2028, timeout 5000ms / timeTaken 5201~5952ms) | — |
| 2 | `board/route.ts` — `$transaction([...N])` → `$executeRaw` + `CASE WHEN` 단일 UPDATE. Prisma.sql/Prisma.join 파라미터 바인딩 + updatedAt 명시 세팅 | `8a1cc2b` |
| 3 | `boardMutation` — optimistic update + 롤백 + res.ok 체크 / 보드 카드 `<Link>` 3곳 `prefetch={false}` | `e47d976` |
| 4 | KanbanColumn useSortable→useDroppable 교체 + handleDragEnd arrayMove로 재작성 (같은 컬럼 순서 변경 동작) | `088e565` |
| 5 | RichEditor text-gray-900 + 요소별 색상 + editable=false 뷰어 모드 / 이슈 상세 description을 RichEditor로 렌더 | `ce3eaf4` |
| 6 | Comment.parentId + self relation + @@index (Turso ALTER TABLE 먼저) / POST parentId 검증 + 1-depth + 상위 작성자 알림 / 트리 UI + 답글 폼 | `60a2e40` |
| 7 | UserAvatar 컴포넌트 신설(avatarUrl 또는 해시색상+이니셜) / 이슈 상세 아바타 3곳 교체 / 색상 전반 상향 / 전체 탭 답글 배지 | `5dc4c98` |
| 8 | Turso User 이름 정정 (withwooyong→허우용, Ted→테드) + seed.ts "Ted" 9곳→"허우용" + login 테스트 안내 정정 | `21e764f` |
| 9 | ADR-027/028 추가 + user-guide.md 답글 섹션 추가 + CHANGELOG/HANDOFF 업데이트 | 금회 /handoff |

## Recent Commits

```
21e764f  chore: seed/테스트 안내의 하드코딩 "Ted"를 "허우용"으로 정정
5dc4c98  feat: UserAvatar + 이슈 상세 페이지 가독성 개선
60a2e40  feat: 댓글 대댓글 1-depth 구조 (스키마 + API + 트리 UI + 알림)
ce3eaf4  fix: 이슈 설명 에디터 가독성 + 상세 뷰 RichEditor 재사용
088e565  fix: 칸반 같은 컬럼 내 순서 변경 동작 (useDroppable + arrayMove)
e47d976  fix: 칸반 보드 반응속도/비용 튜닝 (optimistic UI + r.ok + prefetch=false)
8a1cc2b  fix: 칸반 보드 PATCH Prisma 트랜잭션 타임아웃 해소 (Raw SQL CASE WHEN)
dcfdf33  debug: board PATCH catch 블록에 console.error 추가
```

## Key Decisions

### 칸반 보드 batch update: `$executeRaw` + CASE WHEN (ADR-027)
- libSQL 원격 어댑터가 `$transaction([...N update])`의 update들을 **직렬로** RTT 왕복 → 한국↔도쿄 RTT × N이 5초 타임아웃 초과 (P2028)
- 해결: 단일 `UPDATE ... CASE id WHEN ... END` 1 RTT. items가 몇 개든 안전. SQLite 단일 UPDATE는 원자적이라 기존 multi-step txn보다 오히려 안전
- `Prisma.sql`/`Prisma.join` 파라미터 바인딩으로 injection 안전. `updatedAt` 명시 세팅(raw는 `@updatedAt` 훅 우회)

### 댓글 대댓글 1-depth, 트리 들여쓰기, 상위 작성자 알림 (ADR-028)
- depth 1단계 제한 — N-depth 재귀 UI는 모바일 인덴트 폭 문제. 대화 길어지면 새 댓글로 이어가는 것이 건강
- 조회 API는 **flat 응답 유지**, 클라에서 `parentId`로 그룹핑. 서버 include 변경 최소
- Turso 마이그: `ALTER TABLE ... ADD COLUMN parentId TEXT` + `CREATE INDEX` (SQLite ALTER는 REFERENCES 미지원이라 애플리케이션 레벨 FK로)
- 알림: `ISSUE_COMMENTED` 타입 유지, title만 "새 답글"로 구분

### 그 외
- **Optimistic UI > 서버 왕복 대기**: `onMutate` + `setQueryData` + `onError` 롤백 + `onSettled` invalidate 패턴
- **Dense list에는 `prefetch={false}`**: 칸반 카드 100개 × Next.js 자동 viewport prefetch = Vercel λ 100회 호출. 첫 클릭 1-2초 로딩 허용 대가로 비용 회수
- **`useDroppable` vs `useSortable`**: SortableContext 밖 컬럼에는 `useDroppable`이 맞음. `arrayMove` 유틸로 재정렬 (splice 두 번 꼬임 제거)
- **Tiptap RichEditor를 뷰어 모드로 재사용**: `dangerouslySetInnerHTML` 없이 ProseMirror schema 기반 렌더라 XSS 안전
- **아바타 해시 색상**: 이름 공유(동명이인) 시 이름 기반 해시로는 구분 불가. 향후 id 기반 seed로 확장 여지. 금회는 이름 자체 정정으로 해결

## Known Issues

### 기존 이슈 (유지)

- **이슈 상세 편집 모드는 여전히 `<textarea>` 사용** — new 경로(RichEditor)와 불일치. HTML 원본 raw 편집
- **모바일 댓글 들여쓰기 `ml-10` 과다** — 좁은 화면에서 답글 영역 압박. `ml-6 md:ml-10` 조정 여지
- **다른 페이지 아바타 `UserAvatar` 미적용** — 사이드바/헤더/notification-dropdown 등 일괄 교체 여지
- **탭 터치 타겟 `py-2` 미적용** — 접근성 전용 커밋에서 일괄 처리
- **ARIA tablist/radiogroup 완전 구현 미실시** — roving tabindex + 화살표 키
- **저장된 필터 팝오버 외부 클릭 닫힘 미구현**
- **DnD 훅 비가시 트리 마운트**: `hidden md:block` 안에서도 `useSortable` 실행. 현 규모 무영향
- **모바일 칸반 카드 순서 조정 미지원** (ADR-026 후속)
- **`boardMutation.onError` 토스트 UI 없음** — `r.ok` 체크로 surface 되지만 토스트/인라인 메시지 미구현
- **모바일 상태 select optimistic UI 없음** (데스크톱 DnD는 13-3차 해결)
- **`label.color` hex 무검증 `style` 인라인** / **`JSON.parse(f.filters)` try-catch 누락**
- **이슈 상세 `data!.issue.id` non-null** / **`commentMutation`의 `data?.issue?.id`**
- **deployments fetch `r.ok` 체크 누락** / **`environment` 타입 `string`** (`DeployEnvironment` 아님)
- **`window.confirm()` 사용** — iOS WKWebView 차단 가능
- **BurndownChart 모바일 텍스트 가독성** — viewBox 축소 시 ≈6px
- **e2e 선택자 견고성** — `data-testid` 부여 권장
- **기존**: Outbox inline drain fire-and-forget, 첨부 Vercel 함수 경유, Prisma CLI `libsql://` 미지원, JWT role DB 미동기, 프로젝트 멤버십 미검증, 관리자용 사용자 매핑 화면 없음, push 이벤트 rate limit 없음
- **Vercel ↔ GitHub 자동 배포 미트리거** — 매번 `vercel --prod --yes` 수동 실행 필요
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 무관

## Pending Improvements

- [ ] **이슈 상세 편집 모드 RichEditor 전환** — 현재 textarea로 HTML raw 편집
- [ ] **댓글/답글 입력도 RichEditor 적용** — 설명과 일관성
- [ ] **다른 페이지 아바타 `UserAvatar` 교체** — 사이드바/헤더/기타 페이지 확장
- [ ] **Vercel ↔ GitHub 자동 배포 재연동**
- [ ] **접근성 전용 커밋 (누적)** — 탭 `py-2` + ARIA tablist 완전 + 팝오버 외부 클릭
- [ ] **`boardMutation` 에러 토스트 UI** — surface는 됐으나 사용자 피드백 UI 미구현
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

- **사용자 원본 의도**: 13-2차에 남긴 "칸반 드래그 500" 진단 로그를 뽑고 근본 해결 → 이어지는 UX 개선(반응속도/비용/순서 변경) → 에디터/상세 화면 정비 → 댓글 대댓글 구조 → 아바타/가독성 → seed 이름 정정까지 일괄 마무리
- **다음 세션 후보**: (a) 접근성 전용 커밋 / (b) Vercel ↔ GitHub 자동 배포 재연동 / (c) `boardMutation` 에러 토스트 UI / (d) 댓글/답글 RichEditor 적용 / (e) 이슈 상세 편집 모드 RichEditor / (f) Rate limiting / (g) Slack 외부 알림 / (h) 설정 페이지 2차
- 사용자(Ted=허우용) 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드 → HANDOFF/커밋). 푸시·프로덕션 배포는 명시 요청 시. 커밋 메시지 한글. **Turso 스키마 변경 같은 비가역 작업은 승인 요청 후 실행**
- **푸시 상태**: 모든 커밋 `origin/main` 반영 완료
- **Co-Authored-By**: 프로젝트 `.claude/settings.local.json`에서 `includeCoAuthoredBy: true`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker`
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

## Files Modified This Session

```
 CHANGELOG.md                                       |  72 +++++++
 HANDOFF.md                                         | (전면 개편)
 docs/ADR.md                                        | ADR-027, ADR-028 추가
 docs/user-guide.md                                 | 답글 섹션 추가
 prisma/schema.prisma                               |  +9 Comment.parentId + self relation + @@index
 prisma/seed.ts                                     |  "Ted" 9곳 → "허우용"
 src/app/api/projects/[projectId]/board/route.ts    |  $transaction → $executeRaw CASE WHEN
 .../issues/[issueId]/comments/route.ts             |  parentId 검증 + 상위 작성자 알림
 src/app/login/page.tsx                             |  테스트 계정 안내 "Ted" → "허우용"
 src/app/projects/[projectKey]/board/page.tsx       |  optimistic + prefetch=false + useDroppable + arrayMove
 .../issues/[issueNumber]/page.tsx                  |  RichEditor 뷰어 / 트리 댓글 / UserAvatar / 색상 상향
 src/components/common/rich-editor.tsx              |  뷰어 모드 + 텍스트 색상
 src/components/common/user-avatar.tsx              |  +67 신설
 src/components/issues/issue-card.tsx               |  prefetch={false}
 src/types/issue.ts                                 |  Comment.parentId
```
