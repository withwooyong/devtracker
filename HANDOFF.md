# Session Handoff

> Last updated: 2026-04-20 (KST, 4차 + /handoff)
> Branch: `main`
> Latest commit: `20dedb5` — ADR-014 보완 + ADR-018 Outbox 추가 + HANDOFF 4차 갱신
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 완료 + 분리 이슈 3건 전부 해결 (백로그 limit, Private Blob 마이그레이션, 알림 Outbox). E2E 43/43 통과, 프로덕션 배포 + GitHub webhook ping + Private Blob 프록시 + Outbox cron 검증 완료. /handoff로 CHANGELOG + 관련 docs(e2e-testing-guide, feature-roadmap-plan, user-guide) 현행화.

## Completed This Session (2026-04-20, 4차 누계)

| # | Task | 비고 |
|---|------|------|
| 1 | Phase 2-1: 스프린트 | Sprint/Issue.sprintId/completedAt, 번다운 차트 SVG |
| 2 | Phase 2-2: 알림 시스템 | Notification 모델, 헤더 벨, 30초 폴링, 5종 트리거 |
| 3 | Phase 3-1: 파일 첨부 | Vercel Blob Private + 프록시 다운로드, MIME magic byte, 20개 제한 |
| 4 | Phase 3-2: GitHub Webhook | PR 자동 연결, HMAC SHA-256, 머지 시 DONE |
| 5 | 분리 이슈: 백로그 limit | issues API `?sprintId=none` 필터 |
| 6 | 분리 이슈: Private Blob | 프록시 `/api/.../download` 엔드포인트 |
| 7 | 분리 이슈: 알림 Outbox | NotificationOutbox + inline drain + 일일 cron |
| 8 | 보안/코드 리뷰 반영 | IDOR, MIME 검증, orphan blob, DoS, race 등 |
| 9 | E2E 43건 | 신규 Journey 7~11 + 기존 |
| 10 | ADR 018건 | ADR-013~018 작성 |

## Recent Commits

```
20dedb5  ADR-014 보완 + ADR-018 Outbox 추가 + HANDOFF 4차 갱신
5d2bf99  Outbox 드레인을 인라인 + 일일 cron 조합으로 전환
ea877a4  알림 Outbox 패턴: 유실 방지 + 재시도
f8c7d7e  ADR-016 Private 전환 반영 + HANDOFF 분리 이슈 2건 완료 체크
77b60a7  첨부 Private Blob 마이그레이션: 프록시 다운로드로 접근 제어
287a804  백로그 이슈 조회 limit=100 제약 해소
1ebaef1  DEV-64 검증 임시 문서 제거
b399218  (GitHub squash) DEV-64 webhook 검증 문서 추가
0bb242f  webhook 경로를 프록시 public list에 추가 + 무인증 접근 E2E
fc81bff  Phase 3-2 GitHub 연동 + MIME magic byte 검증
b263347  Phase 3-1 파일 첨부: Vercel Blob + 이슈 연동
ce954c9  ADR-016/017 추가 + HANDOFF Phase 3 완료 반영
d369139  ADR-013/014/015 추가 + HANDOFF Phase 2 완료 반영
f04cb0d  Vercel 배포 빌드 실패 수정: pnpm 호이스팅 + webpack 빌드
43d33f3  스프린트 생성 폼: zod 상세 에러 메시지 노출
f4548ac  알림 시스템 리뷰 지적사항 반영
3783430  Phase 2-2 알림 시스템 + 번다운 정확도 개선 + 스프린트 E2E
9bdf6b0  Phase 2-1 스프린트 기능 추가: 모델/API/UI + 번다운 차트
```

## Key Decisions

- **Vercel Blob Private + 프록시 다운로드** (ADR-016): `access: "private"` + `/api/.../download` 프록시. 브라우저는 blob URL 직접 접근 불가.
- **MIME 이중 검증**: Content-Type + file-type magic byte 교차 검증
- **GitHub 전역 webhook secret**: 프로젝트별 설정 없이 `GITHUB_WEBHOOK_SECRET` 하나로. 다중 레포 필요 시 ProjectSettings 확장
- **proxy.ts 공개 경로 확장**: `/api/webhooks`, `/api/cron` — JWT 인증 대신 서명(HMAC) 또는 Bearer 검증으로 신뢰성 확보
- **알림 Outbox 패턴** (ADR-018): `createNotifications()` → NotificationOutbox insert → inline fire-and-forget drain + 일일 cron safety net. Hobby 플랜 cron 제약으로 분단위 불가, inline이 대부분 커버.
- **백로그 조회**: `?sprintId=none` 서버 필터로 클라이언트 필터 제거, 100개 상한 해결

## Known Issues

- **Outbox 진정한 아토믹성 미보장**: 본 요청 커밋 후 outbox insert 실패 시 유실 가능 (fire-and-forget). 각 API 핸들러를 `$transaction`으로 감싸는 후속 작업 필요
- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **GitHub 사용자 매핑 없음**: PR 머지로 인한 이슈 상태 변경 Activity가 reporter 명의
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **이모지 → SVG 일관성 미점검**

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] 프로젝트 설정 페이지 (`/projects/[key]/settings`) — 프로젝트별 GitHub 레포 연결
- [ ] GitHub 사용자 ↔ DevTracker 사용자 매핑
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [ ] 알림 Outbox 아토믹성 강화 (`$transaction` 도입)
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (77b60a7)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (287a804)
- [x] ~~알림 Outbox 패턴~~ — 완료 (5d2bf99)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 모두 완료**. 다음 방향은 (a) Phase 4 탐색, (b) 실제 팀 투입 전 내부 QA, (c) 나머지 pending 개선 항목 중 선택
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
- `CRON_SECRET` — Vercel Cron Bearer 인증 (분리 이슈 Outbox)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 + `GITHUB_WEBHOOK_SECRET`, `CRON_SECRET`은 env pull에 포함되지 않으므로 수동으로 test용 값 추가 필요 (`test-secret-for-local-dev`, `cron-test-secret-for-local`)
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test`
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
