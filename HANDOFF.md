# Session Handoff

> Last updated: 2026-04-21 (KST, 9차 세션 + /handoff)
> Branch: `main`
> Latest commit: `69a09dc` — /handoff: 프로젝트별 webhook secret CHANGELOG/HANDOFF + ADR-021 + e2e 가이드 54개
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅(ADR-020) + 프로젝트별 webhook secret(ADR-021)에 이어, 이번 세션에 **GitHub 사용자 매핑(ADR-022)** 을 도입. `User.githubLogin`/`User.githubId` 필드, `PATCH /api/auth/me` 셀프 등록, webhook의 `resolvePullRequestAuthor()`로 PR 작성자를 매칭해 STATUS_CHANGED Activity의 `userId`를 실제 행위자로 기록(실패 시 reporter 폴백). 사이드바 "내 프로필" 링크 + `/settings` 프로필 페이지. E2E **60/60**(54 → +6), tsc/lint/build 클린. 로컬 7개 파일 변경 pending.

## Completed This Session (2026-04-21, 9차)

| # | Task | Files |
|---|------|-------|
| 1 | `User.githubLogin String? @unique`, `User.githubId Int? @unique` 스키마 추가 + 로컬 SQLite/Turso ALTER + unique index + prisma generate | `prisma/schema.prisma` |
| 2 | `GET` 응답에 `githubLogin` 포함 + `PATCH /api/auth/me` 신설(정규식 검증 + 중복 선검사 409) | `src/app/api/auth/me/route.ts` |
| 3 | webhook에 `resolvePullRequestAuthor()` 추가: `githubId → githubLogin` 순 매칭, login 매칭 시 `githubId` 항상 최신화(unique 충돌은 warn). `Activity.userId`에 매칭 user 반영, 실패 시 reporter 폴백. 응답에 `prAuthorMatched` 필드 | `src/app/api/webhooks/github/route.ts` |
| 4 | `/settings` 사용자 프로필 페이지 신설(이메일·이름 read-only + GitHub 로그인 편집, 저장 후 쿼리 무효화) | `src/app/settings/page.tsx` |
| 5 | 사이드바 사용자 블록에 "내 프로필" 링크 + 현재 경로 강조 | `src/components/layout/sidebar.tsx` |
| 6 | `User` 타입에 `githubLogin?: string \| null` 추가 | `src/types/user.ts` |
| 7 | E2E Journey 13 × 6건 + 공유 fixture 정리 | `tests/e2e/user-mapping.spec.ts` |
| 8 | ADR-022 + CHANGELOG + user-guide 10-4 + e2e-testing-guide 60개 반영 | `docs/ADR.md`, `CHANGELOG.md`, `docs/user-guide.md`, `docs/e2e-testing-guide.md` |

### 직전 세션들

- **8차** (`812e2fa` + `69a09dc`): 프로젝트별 webhook secret — `Project.githubWebhookSecret` 필드, 라우팅 순서 재설계(파싱→scoped조회→secret 선택→HMAC 검증), 설정 페이지 Webhook Secret 섹션, Journey 10c × 3건
- **7차** (`03c0ec7` + `187e3d1`): GitHub webhook 하이브리드 라우팅 — `Project.githubRepo` 우선, 키-prefix 폴백. Journey 10b × 3건
- **6차** (`7a82bb4` + `eb8f47d`): 프로젝트 설정 페이지 1차 — `Project.githubRepo` 필드, `/projects/[key]/settings` 신설, PATCH 권한 `ADMIN OR createdBy`로 확장

## Recent Commits

```
69a09dc  /handoff: 프로젝트별 webhook secret CHANGELOG/HANDOFF + ADR-021 + e2e 가이드 54개
812e2fa  프로젝트별 GitHub webhook secret: scoped 모드에서 서명 재검증
9df648e  /handoff: 다음 세션 후보 (a) 프로젝트별 webhook secret 추천 주석 보강
187e3d1  /handoff: 하이브리드 라우팅 CHANGELOG/HANDOFF + e2e 가이드 현행화
03c0ec7  GitHub webhook 하이브리드 라우팅: githubRepo 우선, 키-prefix 폴백
eb8f47d  /handoff: 설정 페이지 1차 CHANGELOG/HANDOFF + 관련 docs 현행화
7a82bb4  프로젝트 설정 페이지 1차: description/githubRepo 편집 + 권한 확장
c9c290a  /handoff: CHANGELOG 2026-04-21 항목 + HANDOFF 5차 갱신
a38aaa9  알림 Outbox 아토믹성 강화: Transactional Outbox 승격
df1356b  /handoff: CHANGELOG + 관련 docs 현행화 (Phase 2·3 + 분리 이슈 반영)
```

## Key Decisions

- **OAuth 없이 self-service 매핑** (ADR-022): 5~20명 팀 도구로는 OAuth 서버 운영 부담이 과잉. 사용자가 본인 프로필에서 GitHub 로그인을 직접 입력하는 방식으로 시작.
- **`githubId` 자동 최신화**: login 매칭 시 PR payload의 `id`로 user.githubId를 항상 덮어써 **로그인 변경 내성** 확보. 다음 요청은 id 경로로 즉시 매칭됨. unique 충돌은 warn 로그 + 이번 요청은 login 매칭 결과로 응답(희귀 케이스).
- **폴백 투명성**: 매칭 실패 시 `Activity.userId`를 `issue.reporterId`로 폴백하되, 응답에 `prAuthorMatched: false`를 실어 관측성을 깨지 않음.
- **409 선검사 채택**: libSQL 어댑터 경유 Prisma P2002 코드가 환경 의존적이라 catch 기반 감지 취약. `projects/route.ts`/`auth/register/route.ts`의 pre-insert 검사 패턴과 통일.
- **자기 프로필만 수정**: `PATCH /api/auth/me`는 토큰의 `userId`로만 update. 타인 `githubLogin` 변경 불가 — 관리자 UI는 후속.
- **정규식으로 형식 검증**: GitHub 로그인 규칙(영숫자·중간 하이픈, 1~39자)을 서버/프론트 양쪽에서 동일하게 적용.

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **설정 페이지의 name 편집 미노출**: 프로젝트 설정 스키마·API는 허용하지만 UI는 description/githubRepo/secret만. 후속
- **관리자용 사용자 매핑 화면 없음**: 다른 사용자의 githubLogin 조회/수정/해제 UI는 후속
- **GitHub push 이벤트 미지원**: commit ↔ 이슈 연결. 매핑 규칙(`resolvePullRequestAuthor`)은 재사용 가능하게 설계됨
- **Activities API의 UUID 파싱 엣지**: `issueId` 경로 파라미터를 `parseInt` 먼저 시도하므로 UUID 앞자리가 숫자면 엉뚱한 이슈에 매칭. 운영 호출은 `issueNumber`로 쓰므로 실사용 영향은 낮지만 엣지 버그 존재
- **Webhook secret 로테이션 감사 로그 없음**: 누가 언제 변경했는지 추적 불가
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관, 필요 시 수동 drop 권장

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] 관리자용 사용자 매핑 관리 화면 (다른 사용자 githubLogin 조회/수정/해제)
- [ ] Webhook secret 로테이션 감사 로그 (변경 주체/시점 기록)
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [ ] 설정 페이지 2차: name 편집, 파괴적 액션(프로젝트 삭제) 영역 분리
- [ ] Activities API의 `issueId` 파라미터 파싱 강화 (UUID 우선)
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (`77b60a7`)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (`287a804`)
- [x] ~~알림 Outbox 패턴~~ — 완료 (`5d2bf99`)
- [x] ~~알림 Outbox 아토믹성 강화 (`$transaction` 도입)~~ — 완료 (`a38aaa9`)
- [x] ~~프로젝트 설정 페이지 1차 (description·githubRepo 편집)~~ — 완료 (`7a82bb4`)
- [x] ~~webhook 라우팅을 `Project.githubRepo` 기반으로 전환 (하이브리드)~~ — 완료 (`03c0ec7`)
- [x] ~~프로젝트별 webhook secret (`Project.githubWebhookSecret`)~~ — 완료 (`812e2fa`)
- [x] ~~GitHub 사용자 ↔ DevTracker 사용자 매핑~~ — 완료 (이번 세션, 커밋 대기)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅 + 프로젝트별 webhook secret + 사용자 매핑까지 완료**. 다음 후보:
  - (a) **Rate limiting** (알림/첨부/webhook) — Upstash Redis 또는 Vercel Edge Config. webhook은 서명 검증 전 단계에 도입(프로젝트별 secret 조회 증폭 방어 목적)
  - (b) **설정 페이지 2차** (name 편집, 프로젝트 삭제 파괴적 영역 분리, 관리자용 사용자 매핑 관리 화면)
  - (c) **GitHub push 이벤트 지원** (커밋 ↔ 이슈 연결). `resolvePullRequestAuthor()` 재사용 가능
  - (d) **Phase 4 탐색** (대시보드 지표 확장, 검색, 권한 정교화)
  - (e) Activities API의 `issueId` 파라미터 파싱 강화(UUID 우선) — 작은 정리 작업
- 사용자 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드·E2E → HANDOFF/커밋). 푸시는 명시 요청 시에만. 커밋 메시지 한글.
- 작업계획서: `docs/feature-roadmap-plan.md`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker` (webhook 등록 완료, 전역 secret 사용 중 — 프로젝트별 secret 설정 시 전환 가능)
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Private store (Phase 3-1)
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 전역 fallback secret (프로젝트별 secret 미설정 시 사용)
- `CRON_SECRET` — Vercel Cron Bearer 인증 (Outbox 드레인)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`. 새 unique 제약일 경우 `--accept-data-loss` 필요할 수 있음(기존 중복 데이터 없는 필드 추가는 실질 데이터 유실 없음)
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 + `GITHUB_WEBHOOK_SECRET`, `CRON_SECRET`은 env pull에 포함되지 않으므로 수동으로 test용 값 추가 (`test-secret-for-local-dev`, `cron-test-secret-for-local`)
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 journey는 `pnpm playwright test user-mapping`)
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력 → scoped 모드 자동 활성
- **프로젝트별 webhook secret 설정**: `/projects/[key]/settings` → "Webhook Secret"에 16자 이상 입력 → 저장. GitHub 측 webhook secret도 동일 값으로 변경 필요. 제거 시 전역 secret 폴백
- **본인 GitHub 계정 연결**: 사이드바 하단 "내 프로필" → GitHub 로그인 입력 → 저장. 본인 PR 머지 시 STATUS_CHANGED Activity가 본인 명의로 기록
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
