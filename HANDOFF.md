# Session Handoff

> Last updated: 2026-04-21 (KST, 12차 세션 + /handoff)
> Branch: `main`
> Latest commit: `b5f7dc8` — /handoff: 타입 배지 UI CHANGELOG/HANDOFF + ADR-024 + e2e 가이드 68개
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅(ADR-020) + 프로젝트별 webhook secret(ADR-021) + 사용자 매핑(ADR-022) + push 이벤트(ADR-023) + 타입 배지 UI(ADR-024)에 이어, 이번 세션은 **기술 부채 정리 묶음(ADR-025)**. 4개 항목을 한 번에 해소: (1) `GitHubLink.type` 캐스트 제거 + 타입 가드, (2) Activities/GitHubLinks API UUID-우선 파싱 통일, (3) `safeCompare` 상수시간 엄격화, (4) GitHubLinkList aria-label 통합. 리뷰에서 M1(빈 타입 폴백)·M2(두 라우트 패턴 통일) 추가 수정. E2E **69/69**(68 → +1), tsc/lint/build 클린. 로컬 7개 파일 변경 pending.

## Completed This Session (2026-04-21, 12차)

| # | Task | Files |
|---|------|-------|
| 1 | `GitHubLink.type`/`status`를 `string`으로 변경 + `isGitHubLinkType`/`isGitHubLinkStatus` 타입 가드 추가 | `src/types/github-link.ts` |
| 2 | `as` 캐스트 제거, 가드로 narrowing, anchor `aria-label="{타입} {힌트}: {제목}"`, pill/힌트에 `aria-hidden`, 빈 타입 "링크" 폴백 | `src/components/common/github-link-list.tsx` |
| 3 | `activities/route.ts`의 `issueId` 파싱을 UUID-우선(정규식) → 숫자 → null 순서로 교체. `parseInt` UUID 오파싱 엣지 차단 | `src/app/api/projects/[projectId]/issues/[issueId]/activities/route.ts` |
| 4 | `github-links/route.ts`도 같은 UUID-우선 패턴으로 통일(리뷰 M2) | `src/app/api/projects/[projectId]/issues/[issueId]/github-links/route.ts` |
| 5 | `safeCompare` zero-pad + `timingSafeEqual` 항상 실행 + 길이 동등성 AND 반환으로 상수시간 엄격화 | `src/app/api/webhooks/github/route.ts` |
| 6 | Journey 6에 UUID/issueNumber 양 경로 + `total` 동등 검증 1건. Journey 15 링크 locator를 aria-label 기반으로 교체 | `tests/e2e/activity-log.spec.ts`, `tests/e2e/github-link-badges.spec.ts` |
| 7 | TypeScript reviewer 리뷰 → CRITICAL/HIGH 0, MEDIUM 2(M1 빈 타입 폴백 / M2 github-links 일관성) 수정 반영, LOW 2(VALUES export / handlePush 이슈 N+1) 기록 | — |
| 8 | ADR-025 + CHANGELOG + e2e-testing-guide 69개 반영 | `docs/ADR.md`, `CHANGELOG.md`, `docs/e2e-testing-guide.md` |

### 직전 세션들

- **11차** (`db5357e` + `b5f7dc8`): GitHubLink 타입 배지 UI — PR/커밋/브랜치 컬러 pill + ID 힌트, Journey 15 × 2
- **10차** (`ed41bdd` + `62eddc6`): GitHub push 이벤트 지원 — `handlePush()`, Journey 14/14b × 6
- **9차** (`8af8a94` + `aafcce9`): GitHub 사용자 매핑 — `PATCH /api/auth/me`, `resolvePullRequestAuthor()`, Journey 13 × 6
- **8차** (`812e2fa` + `69a09dc`): 프로젝트별 webhook secret
- **7차** (`03c0ec7` + `187e3d1`): webhook 하이브리드 라우팅

## Recent Commits

```
b5f7dc8  /handoff: 타입 배지 UI CHANGELOG/HANDOFF + ADR-024 + e2e 가이드 68개
db5357e  GitHubLink 타입 배지 UI: PR/커밋/브랜치를 컬러 pill과 ID 힌트로 구분
62eddc6  /handoff: push 이벤트 CHANGELOG/HANDOFF + ADR-023 + e2e 가이드 66개
ed41bdd  GitHub push 이벤트 지원: 커밋 메시지의 이슈 키로 COMMIT 링크 생성
aafcce9  /handoff: 사용자 매핑 CHANGELOG/HANDOFF + ADR-022 + e2e 가이드 60개
8af8a94  GitHub 사용자 매핑: PR 작성자를 DevTracker User로 연결
69a09dc  /handoff: 프로젝트별 webhook secret CHANGELOG/HANDOFF + ADR-021 + e2e 가이드 54개
812e2fa  프로젝트별 GitHub webhook secret: scoped 모드에서 서명 재검증
9df648e  /handoff: 다음 세션 후보 (a) 프로젝트별 webhook secret 추천 주석 보강
187e3d1  /handoff: 하이브리드 라우팅 CHANGELOG/HANDOFF + e2e 가이드 현행화
```

## Key Decisions

- **인터페이스는 런타임 진실에 맞춘다** (ADR-025): Prisma `type String`과 TS `GitHubLinkType` 유니언이 다르면 어디선가 `as` 캐스트로 메워짐. `GitHubLink.type: string`으로 바꾸고 타입 가드(`isGitHubLinkType`)가 안전한 경계 형성. 컴포넌트는 가드로 좁혀서 사용, 미지의 값은 회색 폴백 pill로 강등.
- **두 라우트의 `issueId` 파싱 규칙 통일**: `activities`·`github-links` 모두 UUID 정규식 → 숫자 정규식 → null 순서. `parseInt`가 UUID 앞자리를 숫자로 읽는 엣지 완전 차단. 향후 동일 구조 라우트 템플릿.
- **상수시간 비교 엄격화**: sha256=hex(64) 고정 컨텍스트에선 실질 위협은 낮지만, 함수가 재사용되거나 서명 포맷이 바뀌는 상황을 대비해 zero-pad + 길이 AND 패턴으로 전환. 방어적 습관.
- **`aria-label` 통합으로 링크 맥락 단일화**: pill·힌트·제목이 각기 읽히면 "PR, 숫자 123, [DEV-42] 수정" 세 단락으로 파편화. anchor에 `aria-label`로 한 문장, pill·힌트에 `aria-hidden`. 시각 사용자 배지는 그대로 보임.
- **빈 타입 "링크" 폴백**: DB에 이상값이 들어와도 접근명이 콜론으로 시작하지 않도록 최소 방어.

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도)
- **설정 페이지의 name 편집 미노출**
- **관리자용 사용자 매핑 화면 없음**
- **`handlePush` 이슈 조회 N+1**(LOW): 현재 GitHub 20 commits/delivery 제한으로 실질 문제 없음. 트래픽 증가 시 `findMany` 일괄 조회로 개선 여지
- **`GITHUB_LINK_TYPE_VALUES`/`_STATUS_VALUES` 미export**(LOW): 폼 select/zod 스키마 파생 시 중복 선언 강제. 향후 공유 필요 시 export 추가
- **push 이벤트 rate limit 없음**: 대규모 monorepo에서 푸시 폭주 시 DB 부담
- **Webhook secret 로테이션 감사 로그 없음**
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] 관리자용 사용자 매핑 관리 화면
- [ ] Webhook secret 로테이션 감사 로그
- [ ] Orphan blob cleanup 배치
- [ ] 설정 페이지 2차: name 편집, 삭제 영역 분리
- [ ] push 이벤트 rate limit
- [ ] `handlePush` 이슈 조회 N+1 개선 (findMany 일괄)
- [ ] `GITHUB_LINK_TYPE_VALUES`/`_STATUS_VALUES` export (폼/zod 공유 대비)
- [ ] Slack/Discord 외부 알림 통합 (알림 Outbox 확장)
- [x] ~~GitHub 연동 스토리(라우팅/secret/매핑/push/UI)~~
- [x] ~~기술 부채 정리 묶음 (as 캐스트·UUID 파싱·safeCompare·aria-label)~~ — 완료 (이번 세션, 커밋 대기)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **GitHub 연동 완료 + 최근 5 세션치 기술 부채까지 청소**. 다음 후보:
  - (a) **Rate limiting** (알림/첨부/webhook) — push 도입 이후 webhook 트래픽 표면이 커진 상태. 운영 방어
  - (b) **Slack/Discord 외부 알림 통합** — PR 머지·이슈 완료 같은 핵심 이벤트를 외부 채널로. 알림 Outbox 확장 재사용. 팀 체감 큼
  - (c) **설정 페이지 2차** — name 편집, 프로젝트 삭제 파괴적 영역 분리, 관리자용 사용자 매핑 관리 화면
  - (d) **Phase 4 탐색** — 대시보드 지표 확장, 검색, 권한 정교화. 탐색·계획 필요
  - (e) **문서 정리**: `docs/feature-roadmap-plan.md`가 Phase 1~3까지만 명시 — 이후 Phase 4 로드맵 문서 작성
- 사용자 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드·E2E → HANDOFF/커밋). 푸시는 명시 요청 시에만. 커밋 메시지 한글. 2-커밋 패턴.
- **Co-Authored-By**: 전역 `~/.claude/settings.json`은 `false`이지만, devtracker 프로젝트만 `.claude/settings.local.json`에서 `true`로 override. 다음 세션부터 이 프로젝트 커밋에 꼬리표 재활성.
- 작업계획서: `docs/feature-roadmap-plan.md`(Phase 1~3)
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
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 예: `pnpm playwright test activity-log`)
- **Vercel 재배포**: `vercel --prod --yes`
- **Webhook 이벤트 구독**: GitHub repo → Settings → Webhooks → `Pushes`, `Pull requests` 체크
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력
- **프로젝트별 webhook secret 설정**: 같은 페이지에서 "Webhook Secret" 16자 이상 입력
- **본인 GitHub 계정 연결**: 사이드바 하단 "내 프로필" → GitHub 로그인 입력
- **커밋 메시지에 이슈 링크**: `DEV-123` 형식. push는 링크만, PR merge는 이슈 DONE 전환
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Claude Code 개인 설정**: `.claude/settings.local.json`(gitignored)
