# Session Handoff

> Last updated: 2026-04-20 (KST)
> Branch: `main`
> Latest commit: `f04cb0d` — Vercel 배포 빌드 실패 수정
> Production: https://devtracker-dusky.vercel.app

## Current Status

Phase 2-1 (스프린트) + Phase 2-2 (알림 시스템) + 번다운 정확도 개선 완료. E2E 27/27 통과. 모두 main 푸시 + Vercel 재배포 완료.

## Completed This Session (2026-04-20)

| # | Task | Files |
|---|------|-------|
| 1 | Phase 2-1: 스프린트 | Sprint 모델, API 2종, 페이지 3종, 번다운 SVG 차트, 프로젝트 서브네비 |
| 2 | Phase 2-1 리뷰 반영 | onDelete: SetNull, cross-project IDOR, 날짜 유효성, enum 검증 |
| 3 | 번다운 정확도 | `Issue.completedAt` 필드 추가, status DONE 전환 시 기록 |
| 4 | Phase 2-2: 알림 시스템 | Notification 모델, API, 헬퍼, 드롭다운 UI(30초 폴링), 트리거 5종 통합 |
| 5 | Phase 2-2 리뷰 반영 | ids.max(100), link 내부 경로 검증, HTML 태그 제거, 즉시 invalidate |
| 6 | 스프린트 E2E 6종 | 생성/유효성/탭 이동/상태 전환(PLANNED→ACTIVE)/삭제 |
| 7 | Vercel 빌드 수정 | `.npmrc` 호이스팅 + `serverExternalPackages` + `--webpack` |
| 8 | ADR 3건 추가 | ADR-013/014/015 (스프린트/알림/Prisma 빌드) |

## Commits This Session

```
f04cb0d  Vercel 배포 빌드 실패 수정: pnpm 호이스팅 + webpack 빌드
43d33f3  스프린트 생성 폼: zod 상세 에러 메시지 노출
f4548ac  알림 시스템 리뷰 지적사항 반영
3783430  Phase 2-2 알림 시스템 + 번다운 정확도 개선 + 스프린트 E2E
9bdf6b0  Phase 2-1 스프린트 기능 추가: 모델/API/UI + 번다운 차트
```

## Key Decisions Made

- **스프린트**: Sprint 삭제 시 이슈의 sprintId는 `onDelete: SetNull`로 보존(백로그로 복귀). 번다운 실제선은 `completedAt` 기준 (없으면 `updatedAt` fallback)
- **알림**: 30초 폴링 + 드롭다운 열 때 즉시 invalidate. 실패는 best-effort (호출자에 영향 없음)
- **알림 트리거 스코프**: 이슈 할당 변경/상태 변경(담당자에게), 댓글(담당자+보고자에게), 스프린트 시작/완료(해당 스프린트 이슈 담당자 전원에게) — 본인 제외
- **Vercel 빌드**: Prisma 7 + Turbopack + pnpm 조합에서 `@prisma/client-runtime-utils` MODULE_NOT_FOUND → `.npmrc` 루트 호이스팅 + `build --webpack`으로 해결 (ADR-015)
- **IDOR 강화**: 이슈 PATCH에서 `sprintId` 전달 시 해당 sprint가 같은 프로젝트에 속하는지 필수 검증

## Known Issues

- **Prisma CLI `libsql://` 미지원**: 스키마 변경 시 `prisma db push --url "file:./prisma/dev.db"` → Turso는 `turso db shell devtracker` 직접 ALTER/CREATE
- **Turso FK 드리프트**: `Issue.sprintId` FK에 Turso는 `ON DELETE` 액션이 없음 (ALTER로 추가됨). 전송 시 API 트랜잭션으로 방어 중
- **Board 100개 제한**: `/api/.../board` limit=100
- **백로그 이슈 100개 제한**: 스프린트 상세의 "이슈 추가" 패널에서 `?limit=100` 하드코딩 — 초과 시 일부 누락
- **Refresh token 서버측 무효화 불가**: 7일간 유효
- **JWT role DB 미동기**: ADMIN 강등 즉시 반영 안 됨 (refresh까지)
- **프로젝트 멤버십 미검증**: 의도 — 모든 인증 사용자가 모든 프로젝트 접근 가능
- **번다운 `today` hydration**: `new Date()` 기본값 — 실사용은 문제 없으나 SSR-CSR 타임존 차이 시 mismatch 가능
- **알림 드롭다운 Link 클릭 race**: mutation await 없이 router 이동 — 일반적으로 문제 없음
- **CSP 헤더 미설정**

## Pending Improvements (분리 이슈)

- [ ] 알림 Outbox 패턴 (best-effort → 신뢰성 있게)
- [ ] 백로그 API에 `sprintId=none` 필터 추가 (100개 제한 해결)
- [ ] 드롭다운 Link 클릭 mutation.onSuccess 후 router.push
- [ ] 이모지 → SVG 일관성 점검 (알림 아이콘)
- [ ] 스프린트 상세/알림 UI의 E2E 추가 (현재 시나리오 외)

## Context for Next Session

- 사용자(Ted)는 야나두 개발팀의 Jira 대안 시스템을 구축 중
- Phase 2 완료, **Phase 3 (파일 첨부 - Vercel Blob / GitHub 연동)** 이 다음 작업
- 작업계획서: `docs/feature-roadmap-plan.md` (Phase 3 섹션)
- Production URL: https://devtracker-dusky.vercel.app
- Turso DB: `libsql://devtracker-withwooyong.aws-ap-northeast-1.turso.io`
- GitHub: `withwooyong/devtracker`
- ADMIN: `withwooyong@yanadoocorp.com` / `yanadoo123`
- Obsidian 심볼릭 링크: `Obsidian Vault/Ted/devtracker` → `devtracker/docs/`

## Runbook

- 스키마 변경 시: `npx prisma db push --url "file:./prisma/dev.db"` → `turso db shell devtracker "<SQL>"`로 Turso 반영
- E2E 실행: `pnpm dev &` → `pnpm playwright test`
- Vercel 재배포: `vercel --prod --yes` (CLI 47.2.2+) 또는 push to main
