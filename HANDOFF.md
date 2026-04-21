# Session Handoff

> Last updated: 2026-04-21 (KST, 10차 세션 + /handoff)
> Branch: `main`
> Latest commit: `aafcce9` — /handoff: 사용자 매핑 CHANGELOG/HANDOFF + ADR-022 + e2e 가이드 60개
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅(ADR-020) + 프로젝트별 webhook secret(ADR-021) + 사용자 매핑(ADR-022)에 이어, 이번 세션에 **GitHub push 이벤트 지원(ADR-023)** 을 도입. PR 로직을 `handlePullRequest()`로 추출하고 `handlePush()`를 신설 — 커밋 메시지에서 이슈 키를 뽑아 `GitHubLink(type="COMMIT")`로 연결. 이슈 상태 변경·Activity 생성은 PR의 영역으로 남기고 push는 링크만 생성. `findMany({in})` 배치 조회로 legacy 모드 N+1 제거, `skippedKeys`는 Set으로 중복 제거, `deleted` 응답 shape 통일. E2E **66/66**(60 → +6), tsc/lint/build 클린. 로컬 5개 파일 변경 pending.

## Completed This Session (2026-04-21, 10차)

| # | Task | Files |
|---|------|-------|
| 1 | webhook 라우트 리팩터: PR 로직 `handlePullRequest()` 추출, `resolveProjectForKey()` 공통 헬퍼 도입 (behavior-preserving) | `src/app/api/webhooks/github/route.ts` |
| 2 | `handlePush()` 신설: `GitHubLink(type="COMMIT", status=null, externalId=SHA)` upsert, 1줄 200자 title, (issueId,url) 유니크로 rebase/재전송 dedup | 같음 |
| 3 | 배치 프로젝트 조회로 legacy N+1 제거 (`findMany({ key: { in: uniqueKeys } })`) | 같음 |
| 4 | `skippedKeys`를 Set으로 중복 제거, `deleted: true` 응답에도 `matched: 0, commits: 0` 포함 | 같음 |
| 5 | E2E Journey 14 × 5건 + 14b × 1건: 링크 생성·dedup·다중 commit 부분 매핑·deleted skipped·빈 commits·scoped cross-project skip | `tests/e2e/github-push.spec.ts` |
| 6 | TypeScript reviewer로 코드 리뷰 → CRITICAL 0, HIGH 1(기존 코드·이 PR 범위 밖), MEDIUM 3+LOW 1 모두 수정 반영 | — |
| 7 | ADR-023 + CHANGELOG + user-guide 10-2/10-3 + e2e-testing-guide 66개 반영 | `docs/ADR.md`, `CHANGELOG.md`, `docs/user-guide.md`, `docs/e2e-testing-guide.md` |

### 직전 세션들

- **9차** (`8af8a94` + `aafcce9`): GitHub 사용자 매핑 — `User.githubLogin`/`User.githubId`, `PATCH /api/auth/me`, `resolvePullRequestAuthor()`, `/settings` 페이지, Journey 13 × 6건
- **8차** (`812e2fa` + `69a09dc`): 프로젝트별 webhook secret — `Project.githubWebhookSecret`, 라우팅 순서 재설계, 설정 UI, Journey 10c × 3건
- **7차** (`03c0ec7` + `187e3d1`): webhook 하이브리드 라우팅 — `Project.githubRepo` 우선, 키-prefix 폴백. Journey 10b × 3건
- **6차** (`7a82bb4` + `eb8f47d`): 프로젝트 설정 페이지 1차 — `Project.githubRepo`, `/projects/[key]/settings`, PATCH 권한 확장

## Recent Commits

```
aafcce9  /handoff: 사용자 매핑 CHANGELOG/HANDOFF + ADR-022 + e2e 가이드 60개
8af8a94  GitHub 사용자 매핑: PR 작성자를 DevTracker User로 연결
69a09dc  /handoff: 프로젝트별 webhook secret CHANGELOG/HANDOFF + ADR-021 + e2e 가이드 54개
812e2fa  프로젝트별 GitHub webhook secret: scoped 모드에서 서명 재검증
9df648e  /handoff: 다음 세션 후보 (a) 프로젝트별 webhook secret 추천 주석 보강
187e3d1  /handoff: 하이브리드 라우팅 CHANGELOG/HANDOFF + e2e 가이드 현행화
03c0ec7  GitHub webhook 하이브리드 라우팅: githubRepo 우선, 키-prefix 폴백
eb8f47d  /handoff: 설정 페이지 1차 CHANGELOG/HANDOFF + 관련 docs 현행화
7a82bb4  프로젝트 설정 페이지 1차: description/githubRepo 편집 + 권한 확장
c9c290a  /handoff: CHANGELOG 2026-04-21 항목 + HANDOFF 5차 갱신
```

## Key Decisions

- **상태 변경은 PR의 영역** (ADR-023): 커밋마다 이슈를 DONE 전환하면 활동 로그가 소음이 된다. push는 "링크 기록"만 하고 이슈 상태·Activity는 건드리지 않음 → 활동 로그의 신호 대 잡음 비 유지.
- **push에서 Activity 미생성**: 커밋 단위로 Activity를 만들면 reporter 폴백이 부정확해지고 타임라인이 오염. GitHubLink 리스트 자체가 이벤트 로그 역할.
- **배치 project 조회 (findMany({in}))**: GitHub 기본 20 commits/delivery까지 가능. 루프마다 `findFirst`는 확장성 나쁨. 고유 키 집합을 선수집해 1회 조회로 N+1 제거.
- **`skippedKeys` Set**: 여러 commit에 같은 타 프로젝트 키가 반복되면 응답/로그에 중복이 쌓이던 문제를 Set으로 해결.
- **`deleted: true` 응답 shape 통일**: 초기엔 `matched`/`commits` 생략했지만 클라이언트/파서 관점에선 항상 동일 shape가 단순. `matched: 0, commits: 0` 포함.
- **`resolveProjectForKey()` 공통 헬퍼**: PR/push가 동일한 scoped/legacy 라우팅 규칙을 공유. behavior-preserving refactor로 기존 경로 영향 없음(66/66 그린으로 확인).

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **설정 페이지의 name 편집 미노출**: 프로젝트 설정 UI는 description/githubRepo/secret만. 후속
- **관리자용 사용자 매핑 화면 없음**: 다른 사용자의 githubLogin 조회/수정/해제 UI는 후속
- **`safeCompare` 길이 사전 분기** (기존): sha256 hex 64자 고정 컨텍스트에선 실제 위협 낮음. 엄밀한 상수 시간 비교 원하면 padEnd + `timingSafeEqual` 패턴으로 교체 가능
- **Activities API의 UUID 파싱 엣지** (기존): `issueId` 경로 파라미터를 `parseInt` 먼저 시도하므로 UUID 앞자리가 숫자면 엉뚱한 이슈에 매칭. 운영 호출은 `issueNumber`로 쓰므로 실사용 영향은 낮음
- **push 이벤트 rate limit 없음**: 대규모 monorepo에서 푸시 폭주 시 DB 부담. 다음 후보 (a)와 연결
- **이슈 상세 UI에서 COMMIT 타입 배지 구분 없음**: PR/COMMIT 모두 같은 스타일로 표시 — 구분되는 아이콘/배지 필요
- **Webhook secret 로테이션 감사 로그 없음**
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관, 필요 시 수동 drop 권장

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] 이슈 상세 UI에서 GitHubLink `type` 별 시각적 구분(아이콘/배지)
- [ ] 관리자용 사용자 매핑 관리 화면 (다른 사용자 githubLogin 조회/수정/해제)
- [ ] Webhook secret 로테이션 감사 로그 (변경 주체/시점 기록)
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [ ] 설정 페이지 2차: name 편집, 파괴적 액션(프로젝트 삭제) 영역 분리
- [ ] Activities API의 `issueId` 파라미터 파싱 강화 (UUID 우선)
- [ ] `safeCompare` 상수 시간 비교 엄격화 (HIGH 이슈, 현실적 위협 낮음)
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (`77b60a7`)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (`287a804`)
- [x] ~~알림 Outbox 패턴~~ — 완료 (`5d2bf99`)
- [x] ~~알림 Outbox 아토믹성 강화 (`$transaction` 도입)~~ — 완료 (`a38aaa9`)
- [x] ~~프로젝트 설정 페이지 1차 (description·githubRepo 편집)~~ — 완료 (`7a82bb4`)
- [x] ~~webhook 라우팅을 `Project.githubRepo` 기반으로 전환 (하이브리드)~~ — 완료 (`03c0ec7`)
- [x] ~~프로젝트별 webhook secret (`Project.githubWebhookSecret`)~~ — 완료 (`812e2fa`)
- [x] ~~GitHub 사용자 ↔ DevTracker 사용자 매핑~~ — 완료 (`8af8a94`)
- [x] ~~GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결)~~ — 완료 (이번 세션, 커밋 대기)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅 + 프로젝트별 webhook secret + 사용자 매핑 + push 이벤트까지 완료**. GitHub 연동 스토리 마무리. 다음 후보:
  - (a) **Rate limiting** (알림/첨부/webhook) — Upstash Redis 또는 Vercel Edge Config. push 폭주 + webhook secret 조회 증폭 방어를 동시에 해결
  - (b) **이슈 상세 UI에서 GitHubLink `type` 별 시각적 구분** — 작은 폴리시 작업(아이콘/배지), 체감 UX 개선
  - (c) **설정 페이지 2차** (name 편집, 프로젝트 삭제 파괴적 영역 분리, 관리자용 사용자 매핑 관리 화면)
  - (d) **Phase 4 탐색** (대시보드 지표 확장, 검색, 권한 정교화)
  - (e) Activities API의 `issueId` 파라미터 파싱 강화(UUID 우선) — 작은 정리
  - (f) `safeCompare` 상수 시간 비교 엄격화 — 보안 완결성(현실적 위협 낮음)
- 사용자 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드·E2E → HANDOFF/커밋). 푸시는 명시 요청 시에만. 커밋 메시지 한글. 2-커밋 패턴(구현 / /handoff) 유지.
- 작업계획서: `docs/feature-roadmap-plan.md`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker` (webhook 등록 완료, 전역 secret 사용 중. push 이벤트 구독 시 repo → Webhooks → "Let me select individual events" → `Pushes` 체크 필요)
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Private store (Phase 3-1)
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 전역 fallback secret (프로젝트별 secret 미설정 시 사용)
- `CRON_SECRET` — Vercel Cron Bearer 인증 (Outbox 드레인)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝 `\n` 리터럴 후처리(`sed -i 's/\\n"/"/g'`) + `GITHUB_WEBHOOK_SECRET`/`CRON_SECRET`은 env pull 제외이므로 test용 값 수동 추가(`test-secret-for-local-dev`, `cron-test-secret-for-local`)
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 journey 예: `pnpm playwright test github-push`)
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **Webhook push 이벤트 구독**: GitHub repo → Settings → Webhooks → 해당 webhook → "Let me select individual events" → `Pushes`, `Pull requests` 체크
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력 → scoped 모드 자동 활성
- **프로젝트별 webhook secret 설정**: `/projects/[key]/settings` → "Webhook Secret"에 16자 이상 입력 → 저장. GitHub 측 webhook secret도 동일 값으로 변경 필요
- **본인 GitHub 계정 연결**: 사이드바 하단 "내 프로필" → GitHub 로그인 입력 → 저장
- **커밋 메시지에 이슈 링크**: 커밋 메시지나 PR 제목에 `DEV-123` 형식으로 키를 쓰면 자동 연결. push는 상태 변경 없이 링크만, PR merge는 이슈 상태를 DONE으로 전환
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
