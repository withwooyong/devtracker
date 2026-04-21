# Session Handoff

> Last updated: 2026-04-21 (KST, 11차 세션 + /handoff)
> Branch: `main`
> Latest commit: `62eddc6` — /handoff: push 이벤트 CHANGELOG/HANDOFF + ADR-023 + e2e 가이드 66개
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 1/2/3 + 분리 이슈 3건 + Outbox Transactional + 설정 페이지 1차 + webhook 하이브리드 라우팅(ADR-020) + 프로젝트별 webhook secret(ADR-021) + 사용자 매핑(ADR-022) + push 이벤트(ADR-023)에 이어, 이번 세션에 **GitHubLink 타입 배지 UI(ADR-024)** 를 도입. 이슈 상세 GitHub 섹션에서 PR/커밋/브랜치를 색상 pill과 외부 ID 힌트(`#번호`/SHA 7자)로 한눈에 구분. 도메인 맵(`GITHUB_LINK_TYPE_{LABELS,COLORS}` + `formatGitHubLinkExternalHint()`)은 기존 status 맵과 대칭으로 집중화. E2E locator 견고성 / PR 번호 충돌 등 리뷰 지적 2건 수정 반영. E2E **68/68**(66 → +2), tsc/lint/build 클린. 로컬 4개 파일 변경 pending.

## Completed This Session (2026-04-21, 11차)

| # | Task | Files |
|---|------|-------|
| 1 | `GITHUB_LINK_TYPE_LABELS`(PR/커밋/브랜치), `GITHUB_LINK_TYPE_COLORS`(저채도 pill), `formatGitHubLinkExternalHint()` 헬퍼 추가 | `src/types/github-link.ts` |
| 2 | `GitHubLinkList` 리디자인: 타입 pill + 힌트 muted 폰트 + `data-testid` 부여. 루트 section에도 testid 추가 | `src/components/common/github-link-list.tsx` |
| 3 | E2E Journey 15 × 2건: PR 배지+`#번호`, COMMIT 배지("커밋")+SHA 7자 힌트 렌더링 검증. `getByTestId` 기반 견고한 locator | `tests/e2e/github-link-badges.spec.ts` |
| 4 | 코드 리뷰 반영(MEDIUM 2건): E2E `locator("..")` XPath 부모 참조 → `getByTestId("github-link-section")`, PR 번호 `Date.now() % 1e6` → `Math.floor(Math.random() * 1e9)` | 2, 3 파일 |
| 5 | ADR-024 + CHANGELOG + user-guide 10-2 타입 배지 가이드 + e2e-testing-guide 68개 반영 | `docs/ADR.md`, `CHANGELOG.md`, `docs/user-guide.md`, `docs/e2e-testing-guide.md` |
| 6 | `.claude/settings.local.json`에 `"includeCoAuthoredBy": true` 개인 설정 + `.gitignore`에 해당 파일 격리 — 이 프로젝트 커밋에 Co-Authored-By 꼬리표 재활성(다음 세션부터 적용) | `.gitignore`, `.claude/settings.local.json`(ignored) |

### 직전 세션들

- **10차** (`ed41bdd` + `62eddc6`): GitHub push 이벤트 지원 — `handlePush()`, `GitHubLink(type="COMMIT")` upsert, legacy N+1 제거, Journey 14/14b × 6건
- **9차** (`8af8a94` + `aafcce9`): GitHub 사용자 매핑 — `User.githubLogin`/`User.githubId`, `PATCH /api/auth/me`, `resolvePullRequestAuthor()`, `/settings` 페이지, Journey 13 × 6건
- **8차** (`812e2fa` + `69a09dc`): 프로젝트별 webhook secret
- **7차** (`03c0ec7` + `187e3d1`): webhook 하이브리드 라우팅

## Recent Commits

```
62eddc6  /handoff: push 이벤트 CHANGELOG/HANDOFF + ADR-023 + e2e 가이드 66개
ed41bdd  GitHub push 이벤트 지원: 커밋 메시지의 이슈 키로 COMMIT 링크 생성
aafcce9  /handoff: 사용자 매핑 CHANGELOG/HANDOFF + ADR-022 + e2e 가이드 60개
8af8a94  GitHub 사용자 매핑: PR 작성자를 DevTracker User로 연결
69a09dc  /handoff: 프로젝트별 webhook secret CHANGELOG/HANDOFF + ADR-021 + e2e 가이드 54개
812e2fa  프로젝트별 GitHub webhook secret: scoped 모드에서 서명 재검증
9df648e  /handoff: 다음 세션 후보 (a) 프로젝트별 webhook secret 추천 주석 보강
187e3d1  /handoff: 하이브리드 라우팅 CHANGELOG/HANDOFF + e2e 가이드 현행화
03c0ec7  GitHub webhook 하이브리드 라우팅: githubRepo 우선, 키-prefix 폴백
eb8f47d  /handoff: 설정 페이지 1차 CHANGELOG/HANDOFF + 관련 docs 현행화
```

## Key Decisions

- **채도 위계로 타입과 상태 동시 구분** (ADR-024): 같은 행에 type pill과 status pill이 놓이므로 **type은 낮은 채도(`bg-*-50 border`)**, **status는 높은 채도(`bg-*-100`)** 로 분리. "주인공은 상태, 보조 맥락은 타입"의 시각적 위계 유지.
- **도메인 맵 집중화**: 타입 레이블/색상/힌트를 `types/github-link.ts`에 맵으로 모음. 컴포넌트는 맵 소비만 — 향후 BRANCH 실사용 시 한 군데만 수정.
- **레이블 현지화 전략**: GitHub 고유명사 "PR"은 영문 유지, "COMMIT/BRANCH"는 한글 "커밋/브랜치". 사용자 인지와 UI 일관성 균형.
- **힌트 포맷 규칙**: PR은 `#번호`, COMMIT은 SHA 앞 7자(관행적 git short SHA), 그 외는 null(미표시). 긴 SHA가 제목 truncate를 방해하지 않도록 별도 span 분리.
- **E2E 견고성**: 리뷰에서 `locator("h3").locator("..")` 부모 참조를 지적받아 `data-testid="github-link-section"` 직행으로 교체. 향후 DOM 리팩터에서 무음 실패 방지.
- **개인 설정 격리**: `.claude/settings.local.json`으로 Co-Authored-By 같은 개인 선호를 프로젝트별로 재설정. `.gitignore`에 추가해 개인 파일이 실수로 공유되지 않도록 차단.

## Known Issues

- **Outbox inline drain fire-and-forget**: 서버리스 특성상 응답 종료 시 promise 중단 가능 → 일일 cron이 catch-up
- **첨부 다운로드가 Vercel 함수 경유**: 콜드 스타트 + 대역폭 비용 (팀 규모엔 허용)
- **Prisma CLI `libsql://` 미지원**, **Turso FK 드리프트** (기존)
- **JWT role DB 미동기**, **refresh token 서버측 무효화 불가** (기존)
- **프로젝트 멤버십 미검증** (의도)
- **설정 페이지의 name 편집 미노출**
- **관리자용 사용자 매핑 화면 없음**
- **`GitHubLink.type` 필드 Prisma `String` vs TS 유니언 불일치** (기존 HIGH, 이 PR 범위 밖): 컴포넌트에서 `as GitHubLinkType` 캐스트로 침묵. 근본 해결은 Prisma enum 도입 또는 narrowing 가드
- **GitHubLinkList 스크린 리더 접근성**(LOW): 타입 pill/힌트 span이 독립 텍스트로 읽혀 "PR #123: 제목"이 하나의 컨텍스트로 묶이지 않음. `aria-label`로 개선 여지
- **`safeCompare` 길이 사전 분기** (기존): sha256 hex 64자 고정 컨텍스트에선 위협 낮음
- **Activities API UUID 파싱 엣지** (기존): 운영 호출은 `issueNumber`로 쓰므로 실사용 영향 낮음
- **push 이벤트 rate limit 없음**: 대규모 monorepo에서 푸시 폭주 시 DB 부담
- **Webhook secret 로테이션 감사 로그 없음**
- **이모지 → SVG 일관성 미점검**
- **기존 Stash**: `stash@{0}` WIP on `75e6aa5` — 이번 세션과 무관

## Pending Improvements

- [ ] Rate limiting (알림/첨부/webhook 엔드포인트) — Upstash Redis 또는 Vercel Edge Config
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push (경주 조건)
- [ ] `GitHubLink.type` Prisma enum 도입 또는 narrowing 가드로 `as GitHubLinkType` 캐스트 제거
- [ ] GitHubLinkList `aria-label`로 스크린 리더 컨텍스트 통합
- [ ] 관리자용 사용자 매핑 관리 화면
- [ ] Webhook secret 로테이션 감사 로그
- [ ] Orphan blob cleanup 배치
- [ ] 설정 페이지 2차: name 편집, 삭제 영역 분리
- [ ] Activities API의 `issueId` 파라미터 파싱 강화 (UUID 우선)
- [ ] `safeCompare` 상수 시간 비교 엄격화
- [x] ~~Vercel Blob Private 마이그레이션~~
- [x] ~~알림 Outbox 패턴~~ / ~~Transactional 승격~~
- [x] ~~프로젝트 설정 페이지 1차~~
- [x] ~~webhook 하이브리드 라우팅~~
- [x] ~~프로젝트별 webhook secret~~
- [x] ~~GitHub 사용자 ↔ DevTracker 사용자 매핑~~
- [x] ~~GitHub push 이벤트 지원 (커밋 ↔ 이슈 자동 연결)~~
- [x] ~~이슈 상세 UI에서 GitHubLink type 별 시각적 구분~~ — 완료 (이번 세션, 커밋 대기)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- **GitHub 연동 스토리(라우팅/secret/매핑/push/UI) 마무리**. 다음 후보:
  - (a) **Rate limiting** (알림/첨부/webhook) — push 도입으로 webhook 트래픽 표면이 커진 상태. 운영 안정성 관점 최우선. Upstash Redis 토큰버킷 또는 Vercel Edge Config
  - (b) **설정 페이지 2차** (name 편집, 프로젝트 삭제 파괴적 영역 분리, 관리자용 사용자 매핑 관리 화면)
  - (c) **Phase 4 탐색** (대시보드 지표 확장, 검색, 권한 정교화) — 탐색/계획 필요
  - (d) **작은 정리 묶음**: Activities API UUID 파싱 / `GitHubLink.type` enum / `safeCompare` 상수시간 / GitHubLinkList `aria-label` — 1~2시간
  - (e) **푸시 알림 통합**(Slack/Discord) — 핵심 이벤트(PR 머지, 이슈 완료) 외부 알림
- 사용자 선호: /ted-run 파이프라인(구현 → 리뷰 → 빌드·E2E → HANDOFF/커밋). 푸시는 명시 요청 시에만. 커밋 메시지 한글. 2-커밋 패턴.
- **Co-Authored-By**: 전역 `~/.claude/settings.json`은 `false`이지만, devtracker 프로젝트만 `.claude/settings.local.json`에서 `true`로 override. **다음 세션부터** 이 프로젝트 커밋에 꼬리표 재활성됨.
- 작업계획서: `docs/feature-roadmap-plan.md`
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
- **E2E 실행**: `pnpm dev &` 후 `pnpm playwright test` (단일 예: `pnpm playwright test github-link-badges`)
- **Vercel 재배포**: `vercel --prod --yes`
- **Webhook 이벤트 구독**: GitHub repo → Settings → Webhooks → `Pushes`, `Pull requests` 체크
- **프로젝트에 webhook 레포 연결**: `/projects/[key]/settings` → "GitHub 레포지토리"에 `owner/repo` 입력
- **프로젝트별 webhook secret 설정**: 같은 페이지에서 "Webhook Secret" 16자 이상 입력 → GitHub 측도 동일 값
- **본인 GitHub 계정 연결**: 사이드바 하단 "내 프로필" → GitHub 로그인 입력
- **커밋 메시지에 이슈 링크**: `DEV-123` 형식. push는 링크만, PR merge는 이슈 DONE 전환
- **Outbox 수동 드레인**: `curl -H "Authorization: Bearer $CRON_SECRET" https://devtracker-dusky.vercel.app/api/cron/notifications/drain`
- **Claude Code 개인 설정**: `.claude/settings.local.json`(gitignored) — Co-Authored-By 등 개인 선호. 팀 공유 필요하면 `.claude/settings.json`에 넣기
