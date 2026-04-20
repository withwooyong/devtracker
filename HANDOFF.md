# Session Handoff

> Last updated: 2026-04-20 (KST, 3차)
> Branch: `main`
> Latest commit: `77b60a7` — 첨부 Private Blob 마이그레이션
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 3 전체 완료 + 분리 이슈 2건 (백로그 limit, Private Blob 마이그레이션) 처리. E2E 39/39 통과, 프로덕션 배포 + GitHub webhook ping 200 + Private Blob 프록시 다운로드 검증 완료.

## Completed This Session (2026-04-20, 2차)

| # | Task | Files |
|---|------|-------|
| 1 | Phase 3-1: 파일 첨부 (Vercel Blob Public) | Attachment 모델, API 2종, 드래그앤드롭 UI |
| 2 | Phase 3-1 보안 리뷰 반영 | orphan blob 롤백, sanitizeFilename "..", 이슈당 20개 제한, filename DB 저장 정제 |
| 3 | MIME magic byte 검증 | file-type 라이브러리로 선언 MIME과 실제 바이트 헤더 교차 검증 |
| 4 | Phase 3-2: GitHub Webhook | GitHubLink 모델, HMAC SHA-256 검증, PR 자동 연결, 머지 시 DONE |
| 5 | proxy.ts webhook 경로 예외 | `/api/webhooks`를 JWT 인증 우회에 추가 (GitHub은 쿠키 없음) |
| 6 | UUID/issueNumber 분기 버그 수정 | `parseInt("72ab...")` → 72로 해석되던 404 버그를 `/^\d+$/`로 엄격 분기 |
| 7 | E2E 11건 추가 | 첨부 5 + GitHub 6 (무인증 접근 회귀 방지 포함) |
| 8 | Vercel 환경변수 설정 | `BLOB_READ_WRITE_TOKEN`, `GITHUB_WEBHOOK_SECRET` 프로덕션 등록 |
| 9 | ADR-016/017 추가 | Vercel Blob 결정, GitHub Webhook 결정 기록 |

## Commits This Session (2차)

```
0bb242f  webhook 경로를 프록시 public list에 추가 + 무인증 접근 E2E
fc81bff  Phase 3-2 GitHub 연동 + MIME magic byte 검증
b263347  Phase 3-1 파일 첨부: Vercel Blob + 이슈 연동
d369139  ADR-013/014/015 추가 + HANDOFF Phase 2 완료 반영
f04cb0d  Vercel 배포 빌드 실패 수정: pnpm 호이스팅 + webpack 빌드
43d33f3  스프린트 생성 폼: zod 상세 에러 메시지 노출
f4548ac  알림 시스템 리뷰 지적사항 반영
3783430  Phase 2-2 알림 시스템 + 번다운 정확도 개선 + 스프린트 E2E
9bdf6b0  Phase 2-1 스프린트 기능 추가: 모델/API/UI + 번다운 차트
```

## Key Decisions Made (Phase 3 + 분리 이슈)

- **Vercel Blob Private + 프록시 다운로드** (ADR-016 업데이트): `access: "private"`로 업로드, `/api/.../attachments/[id]/download` 엔드포인트가 인증 후 blob stream 중계. 브라우저는 Blob URL 직접 접근 불가
- **MIME 이중 검증**: 클라이언트 선언 Content-Type + file-type 라이브러리 magic byte. 둘 중 하나만 통과해도 거부
- **Webhook 전역 secret**: 프로젝트별 GitHub 설정 없이 `GITHUB_WEBHOOK_SECRET` 하나로 운영. 다중 레포 필요 시 ProjectSettings 모델 확장
- **proxy.ts 공개 경로 확장**: `/api/webhooks`는 JWT 인증 대신 HMAC 서명으로 신뢰성 확보
- **Webhook 머지 Activity**: `userId`를 이슈 reporter로 기록 (GitHub ↔ DevTracker 사용자 매핑 미구현)
- **백로그 조회**: issues API `?sprintId=none` 필터로 클라이언트 필터링 제거, 100개 상한 해결

## Known Issues

- **GitHub 사용자 매핑 없음**: PR 머지로 인한 이슈 상태 변경 Activity가 reporter 명의
- **첨부 다운로드가 Vercel 함수 경유**: 직접 URL 대비 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도 — 모든 인증 사용자가 모든 프로젝트 접근)
- **이모지 → SVG 일관성 미점검**

## Pending Improvements (분리 이슈)

- [ ] 알림 Outbox 패턴 (best-effort → 신뢰성 있게) — 스키마/워커 설계 필요
- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push
- [ ] GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결, Phase 4+)
- [ ] 프로젝트 설정 페이지 (`/projects/[key]/settings`) — 프로젝트별 GitHub 레포 연결
- [ ] GitHub 사용자 ↔ DevTracker 사용자 매핑
- [ ] Orphan blob cleanup 배치 (head list 대조)
- [x] ~~Vercel Blob Private 마이그레이션~~ — 완료 (77b60a7)
- [x] ~~백로그 API sprintId=none 필터~~ — 완료 (287a804)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **Phase 3 완료**. 다음 방향은 (a) 분리 이슈 처리, (b) Phase 4 탐색, (c) 실제 팀 투입 전 내부 QA 중 선택
- 작업계획서: `docs/feature-roadmap-plan.md`
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker` (webhook 등록 완료)
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Environment Variables (Production)

- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — Turso 연결
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — 토큰 서명
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (Phase 3-1)
- `GITHUB_WEBHOOK_SECRET` — GitHub webhook 서명 검증 (Phase 3-2)

## Runbook

- **스키마 변경**: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"`
- **로컬 env 동기화**: `vercel env pull .env.local --yes` → 끝에 `\n` 리터럴 포함되므로 `sed -i 's/\\n"/"/g'` 후처리 필수
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test`
- **Vercel 재배포**: `vercel --prod --yes` (CLI 47.2.2+)
- **Webhook 재전송**: GitHub repo → Settings → Webhooks → 해당 delivery → Redeliver
