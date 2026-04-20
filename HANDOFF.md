# Session Handoff

> Last updated: 2026-04-21 (KST, 5차 세션 + /handoff)
> Branch: `main`
> Latest commit: `a38aaa9` — 알림 Outbox 아토믹성 강화: Transactional Outbox 승격
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + **알림 Outbox Transactional 승격**까지 완료. 본 요청 write와 outbox insert가 단일 `prisma.$transaction`으로 묶여 유실/유령 알림 가능성 제거. E2E 43/43 유지, 타입/린트/빌드 클린. origin/main 동기화 완료.

## Completed This Session (2026-04-21)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | `notification.ts` Transactional API 설계 | `a38aaa9` | `src/lib/notification.ts` |
| 2 | 이슈 PATCH `$transaction` 적용 + drain guard | `a38aaa9` | `src/app/api/projects/[projectId]/issues/[issueId]/route.ts` |
| 3 | 댓글 POST `$transaction` 적용 + drain guard | `a38aaa9` | `.../issues/[issueId]/comments/route.ts` |
| 4 | 스프린트 PATCH `$transaction` 적용 + read를 tx 밖으로 | `a38aaa9` | `.../sprints/[sprintId]/route.ts` |
| 5 | ADR-018 보강 + HANDOFF Known Issues 정리 | `a38aaa9` | `docs/ADR.md`, `HANDOFF.md` |
| 6 | 코드 리뷰 반영: drain guard, write-only tx, `satisfies NotificationType` | `a38aaa9` | (위 파일들) |
| 7 | E2E 43/43 통과 확인, origin/main 푸시 | `a38aaa9` | — |

## Recent Commits

```
a38aaa9  알림 Outbox 아토믹성 강화: Transactional Outbox 승격
df1356b  /handoff: CHANGELOG + 관련 docs 현행화 (Phase 2·3 + 분리 이슈 반영)
20dedb5  ADR-014 보완 + ADR-018 Outbox 추가 + HANDOFF 4차 갱신
5d2bf99  Outbox 드레인을 인라인 + 일일 cron 조합으로 전환
ea877a4  알림 Outbox 패턴: 유실 방지 + 재시도
f8c7d7e  ADR-016 Private 전환 반영 + HANDOFF 분리 이슈 2건 완료 체크
77b60a7  첨부 Private Blob 마이그레이션: 프록시 다운로드로 접근 제어
287a804  백로그 이슈 조회 limit=100 제약 해소
fc81bff  Phase 3-2 GitHub 연동 + MIME magic byte 검증
b263347  Phase 3-1 파일 첨부: Vercel Blob + 이슈 연동
```

## Key Decisions

- **Transactional Outbox** (ADR-018 보강): `enqueueNotificationsTx(tx, inputs)`는 `Prisma.TransactionClient`만 받도록 시그니처를 강제하여, outbox insert를 트랜잭션 밖에서 수행할 수 있는 경로 자체를 제거. `triggerNotificationDrain()`은 커밋 성공 후에만 호출.
- **Sprint PATCH의 write-only tx 유지**: libSQL(Turso) 단일 라이터 특성상 트랜잭션 내 read가 lock 보유 시간을 늘림. assignee 조회는 tx 밖(`prisma.issue.findMany`)에서 수행, tx 안에는 `sprint.update` + `enqueueNotificationsTx`만 남김.
- **Drain guard**: 실제 알림이 enqueue된 경우(`hasNotifications`, `recipients.length > 0`)에만 `triggerNotificationDrain()` 호출 → 무의미한 outbox 스캔 제거.
- **기존 `createNotification`/`createNotifications` 제거**: 부분 전환이 아니라 API 자체를 없애 호출자가 잘못된 경로를 선택할 여지를 차단.

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **GitHub 사용자 매핑 없음**: PR 머지로 인한 이슈 상태 변경 Activity가 reporter 명의
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0} WIP on main: 75e6aa5 Vercel 빌드 수정` — 이번 세션과 무관, 현 필요 시 확인 후 drop 권장

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] 프로젝트 설정 페이지 (`/projects/[key]/settings`) — 프로젝트별 GitHub 레포 연결
- [ ] GitHub 사용자 ↔ DevTracker 사용자 매핑
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (`77b60a7`)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (`287a804`)
- [x] ~~알림 Outbox 패턴~~ — 완료 (`5d2bf99`)
- [x] ~~알림 Outbox 아토믹성 강화 (`$transaction` 도입)~~ — 완료 (`a38aaa9`)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 + Outbox 아토믹성 강화까지 모두 완료**. 다음 방향은 (a) Phase 4 탐색, (b) 실제 팀 투입 전 내부 QA, (c) 남은 pending 개선 항목 중 선택
- 사용자 선호: /ted-run 파이프라인 방식(구현 → 리뷰 → 빌드 → HANDOFF/커밋). 푸시는 명시 요청 시에만.
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
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 서명 검증 (Phase 3-2)
- `CRON_SECRET` — Vercel Cron Bearer 인증 (Outbox 드레인)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 + `GITHUB_WEBHOOK_SECRET`, `CRON_SECRET`은 env pull에 포함되지 않으므로 수동으로 test용 값 추가 (`test-secret-for-local-dev`, `cron-test-secret-for-local`)
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test`
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
