# Session Handoff

> Last updated: 2026-04-21 (KST, 7차 세션 + /handoff)
> Branch: `main`
> Latest commit: `03c0ec7` — GitHub webhook 하이브리드 라우팅: githubRepo 우선, 키-prefix 폴백
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차에 이어, 이번 세션에 **GitHub webhook 하이브리드 라우팅**을 도입. `Project.githubRepo`를 설정한 프로젝트는 강한 테넌시 경계(scoped), 미설정은 기존 키-prefix(legacy)로 폴백. E2E **51/51**, tsc/lint/build 클린. 로컬 1커밋 pending (푸시 대기).

## Completed This Session (2026-04-21, 7차)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | webhook 라우팅 분기 구현 (scoped/legacy) + `skippedKeys`/`mode` 응답 | `03c0ec7` | `src/app/api/webhooks/github/route.ts` |
| 2 | `PullRequestPayload.repository` optional + null-safe 처리 | `03c0ec7` | 같음 |
| 3 | E2E Journey 10b × 3건 (scoped 매칭, scoped 다른 키 무시, cross-project 부분 처리) | `03c0ec7` | `tests/e2e/github-webhook.spec.ts` |
| 4 | `beforeAll/afterAll`을 `playwright.request.newContext()`로 격리 + 복원 status 검증 | `03c0ec7` | 같음 |
| 5 | 코드 리뷰 반영: HIGH 2건(쿠키 격리·복원 검증)+MEDIUM 2건(타입·silent drop) 전부 수정 | `03c0ec7` | 위 파일들 |
| 6 | ADR-020 추가 + HANDOFF Pending 갱신 + e2e-testing-guide 48 → 51 | `03c0ec7` + (pending) | `docs/ADR.md`, `HANDOFF.md`, `docs/e2e-testing-guide.md` |

### 직전 세션들

- **6차** (`7a82bb4`): 프로젝트 설정 페이지 1차 — `Project.githubRepo` 필드 추가, `/projects/[key]/settings` 신설, PATCH 권한 `ADMIN OR createdBy`로 확장
- **5차** (`a38aaa9`): 알림 Outbox Transactional 승격 — `enqueueNotificationsTx(tx, inputs)` 신설, 3개 트리거 경로를 단일 `$transaction`으로 묶음

## Recent Commits

```
03c0ec7  GitHub webhook 하이브리드 라우팅: githubRepo 우선, 키-prefix 폴백
eb8f47d  /handoff: 설정 페이지 1차 CHANGELOG/HANDOFF + 관련 docs 현행화
7a82bb4  프로젝트 설정 페이지 1차: description/githubRepo 편집 + 권한 확장
c9c290a  /handoff: CHANGELOG 2026-04-21 항목 + HANDOFF 5차 갱신
a38aaa9  알림 Outbox 아토믹성 강화: Transactional Outbox 승격
df1356b  /handoff: CHANGELOG + 관련 docs 현행화 (Phase 2·3 + 분리 이슈 반영)
20dedb5  ADR-014 보완 + ADR-018 Outbox 추가 + HANDOFF 4차 갱신
5d2bf99  Outbox 드레인을 인라인 + 일일 cron 조합으로 전환
ea877a4  알림 Outbox 패턴: 유실 방지 + 재시도
f8c7d7e  ADR-016 Private 전환 반영 + HANDOFF 분리 이슈 2건 완료 체크
```

## Key Decisions

- **하이브리드 라우팅** (ADR-020): `githubRepo` 매칭 시 scoped, 미매칭 시 legacy. Opt-in으로 강한 경계 획득하되 기존 동작 무중단.
- **Silent drop 관측성**: scoped 모드에서 프로젝트 외 이슈 키는 `skippedKeys` 응답 + `console.info` 로그로 노출 → 운영 디버깅.
- **응답에 `mode` 필드 추가**: 호출자/테스트가 어느 경로를 탔는지 확인 가능.
- **타입 방어**: `PullRequestPayload.repository`를 optional로 선언해 타입·런타임 가드 일치.
- **E2E 테스트 격리**: `playwright.request.newContext()`로 setup/teardown 세션을 독립 쿠키 jar로 분리. 복원 실패 시 Journey 10 legacy 테스트가 연쇄적으로 깨지는 문제 차단.

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **GitHub 사용자 매핑 없음**: PR 머지로 인한 이슈 상태 변경 Activity가 reporter 명의
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **설정 페이지의 name 편집 미노출**: 스키마·API는 허용하지만 UI는 description/githubRepo만. 후속
- **webhook secret은 여전히 전역**: `GITHUB_WEBHOOK_SECRET` 하나. 프로젝트별 secret은 후속 항목
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관, 필요 시 수동 drop 권장

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] 프로젝트별 webhook secret (`Project.githubWebhookSecret`) — 현재 전역 secret 공유
- [ ] GitHub 사용자 ↔ DevTracker 사용자 매핑
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [ ] 설정 페이지 2차: name 편집, 파괴적 액션(프로젝트 삭제) 영역 분리
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (`77b60a7`)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (`287a804`)
- [x] ~~알림 Outbox 패턴~~ — 완료 (`5d2bf99`)
- [x] ~~알림 Outbox 아토믹성 강화 (`$transaction` 도입)~~ — 완료 (`a38aaa9`)
- [x] ~~프로젝트 설정 페이지 1차 (description·githubRepo 편집)~~ — 완료 (`7a82bb4`)
- [x] ~~webhook 라우팅을 `Project.githubRepo` 기반으로 전환 (하이브리드)~~ — 완료 (`03c0ec7`)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅까지 완료**. 다음 후보:
  - (a) **프로젝트별 webhook secret** (ADR-020 후속) ← 추천. 현재 전역 `GITHUB_WEBHOOK_SECRET` 하나. 스키마에 `Project.githubWebhookSecret String?` 추가, scoped 모드에서 프로젝트별 secret으로 서명 재검증, 설정 페이지 UI에 password 필드 추가, E2E 1~2건. **주의**: 서명 검증 전에 repo/project 조회가 필요해 라우팅 순서 재설계 필요(body 파싱 → repo hint → project secret으로 재검증). GitHub delivery header 기반 힌트로 body 파싱 전 project 조회 가능성도 검토.
  - (b) GitHub 사용자 ↔ DevTracker 사용자 매핑 (PR 머지 Activity가 reporter 명의로 남는 문제)
  - (c) Rate limiting (알림/첨부/webhook) — Upstash Redis
  - (d) 설정 페이지 2차 (name 편집, 삭제 영역 분리)
  - (e) Phase 4 탐색 (대시보드/리포트, 검색, 권한 정교화)
- 사용자 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드·E2E → HANDOFF/커밋). 푸시는 명시 요청 시에만. 커밋 메시지 한글.
- 작업계획서: `docs/feature-roadmap-plan.md`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker` (webhook 등록 완료)
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob Private store (Phase 3-1)
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 서명 검증 (현재 전역, 후속에서 프로젝트별 분리 예정)
- `CRON_SECRET` — Vercel Cron Bearer 인증 (Outbox 드레인)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 + `GITHUB_WEBHOOK_SECRET`, `CRON_SECRET`은 env pull에 포함되지 않으므로 수동으로 test용 값 추가 (`test-secret-for-local-dev`, `cron-test-secret-for-local`)
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 journey는 `pnpm playwright test github-webhook`)
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력 → scoped 모드 자동 활성
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
