# Session Handoff

> Last updated: 2026-04-21 (KST, 8차 세션 + /handoff)
> Branch: `main`
> Latest commit: `9df648e` — /handoff: 다음 세션 후보 (a) 프로젝트별 webhook secret 추천 주석 보강
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅(ADR-020)에 이어, 이번 세션에 **프로젝트별 webhook secret(ADR-021)** 을 도입. `Project.githubWebhookSecret` 필드 + 라우팅 순서 재설계(파싱 → scoped 조회 → secret 선택 → HMAC 검증) + 설정 페이지 UI에 password 입력·설정됨 뱃지·제거 액션까지. E2E **54/54**(51 → +3), tsc/lint/build 클린. 로컬 6개 파일 변경 pending (커밋 대기).

## Completed This Session (2026-04-21, 8차)

| # | Task | Files |
|---|------|-------|
| 1 | `Project.githubWebhookSecret String?` 스키마 추가 + 로컬 SQLite/Turso ALTER + prisma generate | `prisma/schema.prisma` |
| 2 | webhook 라우팅 순서 재설계: rawBody 파싱 → scoped 조회 → secret 선택(프로젝트 우선) → HMAC 검증. `secretSource` 응답 필드 추가 | `src/app/api/webhooks/github/route.ts` |
| 3 | `GET/PATCH /api/projects/[projectId]` 응답에서 secret 원문 제거 + `githubWebhookSecretSet` 플래그 노출. `updateSchema`에 16~256자 제한 추가 | `src/app/api/projects/[projectId]/route.ts` |
| 4 | 설정 페이지 Webhook Secret 섹션: password 입력 + 설정됨/미설정 뱃지 + 제거/제거 취소 + 저장 후 입력값 초기화 | `src/app/projects/[projectKey]/settings/page.tsx` |
| 5 | `Project` 타입에 `githubWebhookSecretSet?: boolean` 추가 | `src/types/project.ts` |
| 6 | E2E Journey 10c × 3건: GET secret 비노출, 프로젝트 secret 서명 통과(`secretSource=project`), 프로젝트 secret 설정 상태에서 전역 secret 서명은 401 | `tests/e2e/github-webhook.spec.ts` |
| 7 | ADR-021 + CHANGELOG + user-guide Webhook Secret 항목 + e2e-testing-guide 54개 반영 | `docs/ADR.md`, `CHANGELOG.md`, `docs/user-guide.md`, `docs/e2e-testing-guide.md` |

### 직전 세션들

- **7차** (`03c0ec7`): GitHub webhook 하이브리드 라우팅 — `Project.githubRepo` 우선, 키-prefix 폴백. Journey 10b × 3건 추가
- **6차** (`7a82bb4`): 프로젝트 설정 페이지 1차 — `Project.githubRepo` 필드 추가, `/projects/[key]/settings` 신설, PATCH 권한 `ADMIN OR createdBy`로 확장
- **5차** (`a38aaa9`): 알림 Outbox Transactional 승격

## Recent Commits

```
9df648e  /handoff: 다음 세션 후보 (a) 프로젝트별 webhook secret 추천 주석 보강
187e3d1  /handoff: 하이브리드 라우팅 CHANGELOG/HANDOFF + e2e 가이드 현행화
03c0ec7  GitHub webhook 하이브리드 라우팅: githubRepo 우선, 키-prefix 폴백
eb8f47d  /handoff: 설정 페이지 1차 CHANGELOG/HANDOFF + 관련 docs 현행화
7a82bb4  프로젝트 설정 페이지 1차: description/githubRepo 편집 + 권한 확장
c9c290a  /handoff: CHANGELOG 2026-04-21 항목 + HANDOFF 5차 갱신
a38aaa9  알림 Outbox 아토믹성 강화: Transactional Outbox 승격
df1356b  /handoff: CHANGELOG + 관련 docs 현행화 (Phase 2·3 + 분리 이슈 반영)
20dedb5  ADR-014 보완 + ADR-018 Outbox 추가 + HANDOFF 4차 갱신
5d2bf99  Outbox 드레인을 인라인 + 일일 cron 조합으로 전환
```

## Key Decisions

- **검증 순서 재설계** (ADR-021): HMAC 검증 **전에** `JSON.parse + repo 기반 findFirst` 한 번을 수행해 scoped 프로젝트의 secret을 선택한 뒤 검증. 검증 전 부작용은 DB 단일 조회로 제한하고 실패 시 즉시 401 → DoS/증폭 벡터 차단.
- **Secret 선택 규칙**: `scopedProject?.githubWebhookSecret ?? GITHUB_WEBHOOK_SECRET`. 프로젝트 secret 미설정 프로젝트는 기존 동작 그대로(무중단 전환).
- **평문 격리**: `GET/PATCH` 응답은 `githubWebhookSecret` 원문을 절대 포함하지 않음. 저장 후 UI에서 "재설정"하려면 새 값을 다시 입력해야 하며, 제거는 별도 버튼.
- **zod 길이 제한**(16~256자): 오타/너무 짧은 secret 프론트·서버 양쪽에서 차단. 빈 문자열은 서버에서 `null`로 정규화(= 전역 secret 재사용).
- **`secretSource` 응답 필드**: 운영 로그/테스트에서 "이번 요청은 어느 secret으로 통과했는가"를 즉시 확인 가능.

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **GitHub 사용자 매핑 없음**: PR 머지로 인한 이슈 상태 변경 Activity가 reporter 명의
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **설정 페이지의 name 편집 미노출**: 스키마·API는 허용하지만 UI는 description/githubRepo/secret만. 후속
- **Webhook secret 로테이션 감사 로그 없음**: 누가 언제 변경했는지 추적 불가. 후속
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관, 필요 시 수동 drop 권장

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] Webhook secret 로테이션 감사 로그 (변경 주체/시점 기록)
- [ ] GitHub 사용자 ↔ DevTracker 사용자 매핑
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [ ] 설정 페이지 2차: name 편집, 파괴적 액션(프로젝트 삭제) 영역 분리
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (`77b60a7`)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (`287a804`)
- [x] ~~알림 Outbox 패턴~~ — 완료 (`5d2bf99`)
- [x] ~~알림 Outbox 아토믹성 강화 (`$transaction` 도입)~~ — 완료 (`a38aaa9`)
- [x] ~~프로젝트 설정 페이지 1차 (description·githubRepo 편집)~~ — 완료 (`7a82bb4`)
- [x] ~~webhook 라우팅을 `Project.githubRepo` 기반으로 전환 (하이브리드)~~ — 완료 (`03c0ec7`)
- [x] ~~프로젝트별 webhook secret (`Project.githubWebhookSecret`)~~ — 완료 (이번 세션, 커밋 대기)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅 + 프로젝트별 webhook secret까지 완료**. 다음 후보:
  - (a) **GitHub 사용자 ↔ DevTracker 사용자 매핑** ← 추천. PR 머지로 인한 이슈 상태 변경 Activity가 현재 reporter 명의로 남는 문제 해결. `User.githubLogin`/`User.githubId` 필드 추가, webhook payload의 `pull_request.user.login`/`.user.id`로 매칭, 사용자 설정 페이지에 GitHub 계정 연결 UI.
  - (b) Rate limiting (알림/첨부/webhook) — Upstash Redis 또는 Vercel Edge Config
  - (c) 설정 페이지 2차 (name 편집, 삭제 영역 분리, secret 로테이션 감사 로그)
  - (d) GitHub push 이벤트 지원 (커밋 ↔ 이슈 연결)
  - (e) Phase 4 탐색 (대시보드/리포트, 검색, 권한 정교화)
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

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 + `GITHUB_WEBHOOK_SECRET`, `CRON_SECRET`은 env pull에 포함되지 않으므로 수동으로 test용 값 추가 (`test-secret-for-local-dev`, `cron-test-secret-for-local`)
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 journey는 `pnpm playwright test github-webhook`)
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력 → scoped 모드 자동 활성
- **프로젝트별 webhook secret 설정**: `/projects/[key]/settings` → "Webhook Secret"에 16자 이상 입력 → 저장. GitHub 측 webhook secret도 동일 값으로 변경 필요. 제거 시 전역 secret 폴백
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
