# Session Handoff

> Last updated: 2026-04-21 (KST, 6차 세션 + /handoff)
> Branch: `main`
> Latest commit: `7a82bb4` — 프로젝트 설정 페이지 1차: description/githubRepo 편집 + 권한 확장
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional 승격에 이어, 이번 세션에 **프로젝트 설정 페이지 1차 스코프**를 추가. description·githubRepo 편집 + ADMIN/createdBy 권한 가드 + 탭 네비 통합 완료. origin/main 기준 3커밋 ahead (푸시 대기). E2E **48/48**, tsc/lint/build 클린.

## Completed This Session (2026-04-21)

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | `Project.githubRepo String?` 스키마 필드 추가 (+Turso ALTER) | `7a82bb4` | `prisma/schema.prisma`, `src/types/project.ts` |
| 2 | PATCH 권한 `ADMIN OR createdBy` 확장 + zod에 description/githubRepo 추가 | `7a82bb4` | `src/app/api/projects/[projectId]/route.ts` |
| 3 | `/projects/[projectKey]/settings` 페이지 신설 (폼 컴포넌트 분리) | `7a82bb4` | `src/app/projects/[projectKey]/settings/page.tsx` |
| 4 | 4개 탭 페이지(page/board/sprints/deployments)에 "설정" 링크 추가 | `7a82bb4` | 각 page.tsx |
| 5 | E2E Journey 12 × 5건 (탭 노출, 폼 로드, 정상 저장, 형식 오류, 미인증 401) | `7a82bb4` | `tests/e2e/project-settings.spec.ts` |
| 6 | 코드 리뷰 반영: `useEffect` setState 린트 에러 해소, regex `..` 명시 차단, label htmlFor 연결 | `7a82bb4` | 위 파일들 |
| 7 | ADR-019 추가, user-guide·e2e-testing-guide 현행화 | `7a82bb4` + (pending) | `docs/ADR.md`, `docs/user-guide.md`, `docs/e2e-testing-guide.md` |

### 이전 세션(5차) — `a38aaa9` 기준

알림 Outbox Transactional 승격: `enqueueNotificationsTx(tx, inputs)` 신설, 3개 트리거 경로(이슈 PATCH / 댓글 POST / 스프린트 PATCH)를 단일 `$transaction`으로 묶음. 유실·유령 알림 가능성 제거.

## Recent Commits

```
7a82bb4  프로젝트 설정 페이지 1차: description/githubRepo 편집 + 권한 확장
c9c290a  /handoff: CHANGELOG 2026-04-21 항목 + HANDOFF 5차 갱신
a38aaa9  알림 Outbox 아토믹성 강화: Transactional Outbox 승격
df1356b  /handoff: CHANGELOG + 관련 docs 현행화 (Phase 2·3 + 분리 이슈 반영)
20dedb5  ADR-014 보완 + ADR-018 Outbox 추가 + HANDOFF 4차 갱신
5d2bf99  Outbox 드레인을 인라인 + 일일 cron 조합으로 전환
ea877a4  알림 Outbox 패턴: 유실 방지 + 재시도
f8c7d7e  ADR-016 Private 전환 반영 + HANDOFF 분리 이슈 2건 완료 체크
77b60a7  첨부 Private Blob 마이그레이션: 프록시 다운로드로 접근 제어
287a804  백로그 이슈 조회 limit=100 제약 해소
```

## Key Decisions

- **1차 스코프 최소화** (ADR-019): 설정 페이지는 "description + githubRepo 편집"에 한정. webhook 라우팅 교체·사용자 매핑·ADMIN-only 파괴적 액션(삭제, 키 변경)은 별 ADR로 분리.
- **권한 확장**: `role === "ADMIN"` → `role === "ADMIN" || createdById === user.userId`. 생성자가 본인 프로젝트 메타도 못 바꾸는 역설 해소.
- **탭 링크를 항상 노출**: 각 탭 페이지에서 user·project를 매번 조회하지 않도록. 서버가 가드, UI는 힌트.
- **`..` 명시적 차단**: `^(?!.*\.\.)[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$` — 파일시스템에 닿지 않는 DB 문자열이지만 의도 명확화.
- **폼 컴포넌트 분리 + `key={project.id}`**: `useEffect`+`setState` 안티패턴(`react-hooks/set-state-in-effect`) 회피. project.id 바뀌면 폼 전체 remount로 초기값 재동기화.
- **401 vs 403 vs 404 분리 유지**: 리뷰어가 지적한 "정보 노출" 가능성은 본 프로젝트가 "프로젝트 멤버십 미검증(모든 인증 사용자가 모든 프로젝트 접근)"을 의도적으로 허용하고 있어 신규 노출 없음(Known Issues).

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **GitHub 사용자 매핑 없음**: PR 머지로 인한 이슈 상태 변경 Activity가 reporter 명의
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근). 설정 페이지 PATCH 가드에도 이 전제 하에 404/403 분리 허용.
- **설정 페이지의 name 편집 미노출**: 스키마·API는 허용하지만 UI는 description/githubRepo만. 후속 항목 중 필요 시 추가.
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관, 필요 시 수동 drop 권장

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] 프로젝트별 webhook secret (`Project.githubWebhookSecret`) — 현재 전역 secret 공유
- [x] ~~webhook 라우팅을 `Project.githubRepo` 기반으로 전환 (하이브리드)~~ — 완료 (이번 세션)
- [ ] GitHub 사용자 ↔ DevTracker 사용자 매핑
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [ ] 설정 페이지 2차: name 편집, 파괴적 액션(프로젝트 삭제) 영역 분리, 프로젝트별 webhook secret
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (`77b60a7`)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (`287a804`)
- [x] ~~알림 Outbox 패턴~~ — 완료 (`5d2bf99`)
- [x] ~~알림 Outbox 아토믹성 강화 (`$transaction` 도입)~~ — 완료 (`a38aaa9`)
- [x] ~~프로젝트 설정 페이지 1차 (description·githubRepo 편집)~~ — 완료 (`7a82bb4`)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차까지 완료**. 다음 후보는 (a) webhook 라우팅을 `Project.githubRepo` 기반으로 전환, (b) GitHub 사용자 매핑, (c) Rate limiting, (d) 설정 페이지 2차(name 편집·삭제 영역), (e) Phase 4 탐색
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
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 서명 검증 (Phase 3-2, 현재 전역)
- `CRON_SECRET` — Vercel Cron Bearer 인증 (Outbox 드레인)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"` → `npx prisma generate`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 + `GITHUB_WEBHOOK_SECRET`, `CRON_SECRET`은 env pull에 포함되지 않으므로 수동으로 test용 값 추가
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 journey는 `pnpm playwright test project-settings`)
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Vercel Hobby 플랜 cron**: 일일 1회만 허용. 분단위 필요 시 Pro 플랜 + `* * * * *` 또는 인라인 드레인 패턴 사용
