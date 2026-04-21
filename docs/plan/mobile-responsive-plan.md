# 모바일 반응형 디자인 적용 작업계획서

## 1. 목표

- 모바일(iPhone SE 375px부터) / 태블릿(768px) / 데스크톱(1024px+) 3단 브레이크포인트를 기준으로 전 페이지가 가로 스크롤 없이 읽히고 사용 가능하도록 한다.
- 핵심 업무 플로우(로그인 → 프로젝트 선택 → 이슈 목록/상세 → 이슈 생성/수정 → 칸반/스프린트 → 배포)를 모바일 단일 컬럼 레이아웃에서 완결할 수 있게 한다.
- 데스크톱 UX는 회귀 없이 유지한다.

## 2. 현황 분석

전체 UI가 desktop-first로 하드코딩되어 있음. 반응형 유틸리티(`sm:`/`md:`/`lg:`) 사용 파일은 `src/` 전체에서 단 2건.

주요 병목:

| 영역 | 파일 | 문제점 |
|------|------|--------|
| 전역 레이아웃 | `src/components/layout/main-layout.tsx` | `flex min-h-screen` + 고정 `Sidebar` 64 rem → 모바일에서 본문이 밀려나감. 모바일용 토글 없음. |
| 사이드바 | `src/components/layout/sidebar.tsx` | 고정 `w-64`. 드로어/햄버거 메뉴 미구현. |
| 헤더 | `src/components/layout/header.tsx` | `px-6 h-14`, breadcrumb가 한 줄로 확장되어 좁은 폭에서 넘침. 햄버거 버튼 자리 없음. |
| 본문 패딩 | `main-layout.tsx` | `p-6` 고정 → 모바일에서 과도. |
| 프로젝트 탭 네비 | `projects/[projectKey]/**/page.tsx` 5종 | `flex gap-3` 가로 나열. 모바일에서 줄 바꿈으로 깨짐. |
| 이슈 목록 | `projects/[projectKey]/page.tsx` | 6 컬럼 `<table>`. 모바일 카드 뷰 없음. 필터 행은 `flex-wrap`이지만 `w-48` input/select 폭 고정으로 답답. |
| 이슈 상세 | `issues/[issueNumber]/page.tsx` (467줄) | 2단 레이아웃 가정, 우측 메타 패널이 모바일에서 세로 배치 미지원. |
| 칸반 보드 | `board/page.tsx` | 4개 컬럼 `flex` + `min-w-[260px]` 가로 스크롤. 모바일에서는 탭 전환형으로 전환 필요. |
| 스프린트 상세 | `sprints/[sprintId]/page.tsx` | burndown 차트 고정 폭 가능성. |
| 배포 이력 / 설정 | `deployments/page.tsx`, `settings/page.tsx` | 테이블/2단 폼. |
| 대시보드 | `dashboard/page.tsx` | 이미 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` 사용 — 소수 기준점이 됨. |
| 루트 레이아웃 | `src/app/layout.tsx` | `viewport` 메타 미선언(Next 16 기본값 확인 필요). |
| 전역 CSS | `src/app/globals.css` | 반응형 유틸 추가 없이 기본 Tailwind로 충분. |

## 3. 설계 방침

### 3.1 브레이크포인트

Tailwind 기본값 준수:

- 기본 (`< 640`): 모바일, 단일 컬럼
- `sm:` (≥ 640): 큰 모바일 / 소형 태블릿
- `md:` (≥ 768): 태블릿 — 사이드바 드로어 유지, 본문 2단 허용
- `lg:` (≥ 1024): 데스크톱 — 사이드바 고정 표시, 테이블 뷰 복원

"모바일 = 기본 스타일, 확대하면서 `md:`/`lg:`로 기능 추가" 원칙.

### 3.2 공통 레이아웃 패턴

1. **사이드바 → 드로어**: `lg:` 미만에서 `fixed inset-y-0 left-0 -translate-x-full` 상태로 숨기고, 햄버거 토글로 `translate-x-0`. 배경에 반투명 overlay. `lg:` 이상은 기존 `w-64` 고정 유지.
2. **헤더**: 햄버거 버튼을 좌측에 노출(`lg:hidden`), breadcrumb는 `truncate` + `max-w-[...]`로 자르기.
3. **본문 패딩**: `p-4 md:p-6`.
4. **탭 네비게이션**: 프로젝트 하위 5탭을 `overflow-x-auto` 가로 스와이프 가능하게. 또는 `select` fallback은 과잉 — 스와이프 방식으로 통일.
5. **테이블 → 카드**: 이슈/배포 목록은 `hidden md:table` + 모바일 전용 `md:hidden` 카드 뷰 2종 렌더.
6. **폼**: 1열이 기본, `md:grid md:grid-cols-2`로 확장.

### 3.3 새 재사용 컴포넌트

- `src/components/layout/mobile-nav-drawer.tsx` — 사이드바 드로어 래퍼(열림 상태는 Zustand `useUIStore` 또는 로컬 state).
- `src/components/layout/project-tabs.tsx` — 5탭 공통화(현재 5개 페이지에 중복). 가로 스크롤 가능 + 활성 탭 색상.
- `src/components/issues/issue-card.tsx` — 모바일 카드 뷰(제목, #, 상태 뱃지, 우선순위, 담당자 한 줄).

## 4. 작업 단계

작업은 작은 단위로 쪼개어 단계마다 개발서버에서 직접 확인 가능한 상태로 커밋한다.

### Phase 1 — 기반 (1 커밋)

- [ ] `src/app/layout.tsx`에 `export const viewport`로 `width=device-width, initialScale=1` 선언, 다크모드 대응 확인.
- [ ] `src/app/globals.css`에 모바일 기본 `font-size`/터치 타겟(`button { min-height: 44px }` 금지 — 필요 시 Tailwind로) 검토.
- [ ] `useUIStore` 생성 — `isSidebarOpen` boolean.

### Phase 2 — 레이아웃 셸 (1~2 커밋)

- [ ] `Sidebar`를 `MobileNavDrawer` 래퍼와 분리. `lg:` 미만은 `fixed`, 이상은 `static w-64`.
- [ ] `Header`에 햄버거 버튼(`lg:hidden`) + breadcrumb truncate.
- [ ] `MainLayout` 본문 패딩 `p-4 md:p-6`, overlay 처리.
- [ ] e2e: 모바일 뷰포트에서 햄버거 → 사이드바 열림/닫힘 스냅샷.

### Phase 3 — 프로젝트 탭 공통화 (1 커밋)

- [ ] `ProjectTabs` 컴포넌트 추출 → `page.tsx`(이슈 목록), `board`, `sprints`, `deployments`, `settings` 5개에 적용.
- [ ] 모바일에서 `overflow-x-auto` 가로 스와이프.

### Phase 4 — 이슈 목록 (1 커밋)

- [ ] 필터 바: 모바일에서 세로 스택(`flex-col md:flex-row`), 검색 input `w-full md:w-48`.
- [ ] 저장된 필터 드롭다운: 모바일에서는 full-width sheet로 고려(단, 1차는 기존 드롭다운을 left 기준으로 고정 유지).
- [ ] 이슈 테이블을 `hidden md:table`로, 모바일용 `IssueCard` 리스트를 추가.

### Phase 5 — 이슈 상세 (1~2 커밋)

- [ ] 메인 컨텐츠와 메타 패널을 `flex-col lg:flex-row`로.
- [ ] 댓글/활동/첨부 탭 바를 `overflow-x-auto`로.
- [ ] `RichEditor` 툴바 가로 스크롤 확인.
- [ ] `GitHubLinkList`, `AttachmentList`, `ActivityTimeline` 카드 폭/문자열 `break-words` 검증.

### Phase 6 — 칸반 보드 (1 커밋)

- [ ] 모바일(`< md`): 4컬럼을 탭 전환형(상태 선택 `select` 또는 pill 버튼)으로 단일 컬럼 렌더. DnD는 동일 컬럼 내 순서 변경만 유지하고 컬럼 이동은 카드 내부 상태 `select`로 대체.
- [ ] 태블릿/데스크톱: 기존 4컬럼 가로 배치 유지.

### Phase 7 — 스프린트 / 배포 / 설정 (1~2 커밋)

- [ ] 스프린트 목록: 이미 `grid-cols-1 md:grid-cols-2` 사용 중 — 세부 폼 검증.
- [ ] 스프린트 상세: burndown 차트 컨테이너 `w-full`, `ResponsiveContainer` 확인.
- [ ] 배포 이력 테이블 → 모바일 카드 뷰.
- [ ] 프로젝트 설정 / 사용자 설정 폼 1열화.

### Phase 8 — 대시보드 / 로그인 / 404 / 에러 (1 커밋)

- [ ] 대시보드 카드 `min-h`, 텍스트 줄임.
- [ ] 로그인 폼 `max-w-sm mx-auto px-4`.
- [ ] `not-found.tsx`, `error.tsx` 여백 점검.

### Phase 9 — 검증 및 회귀 (1 커밋)

- [ ] Playwright e2e: 모바일 뷰포트(375×667) 프리셋으로 핵심 플로우 스모크 테스트 추가 — 로그인, 이슈 생성, 댓글 추가, 칸반 상태 변경, 배포 등록.
- [ ] 데스크톱 회귀: 기존 e2e 그대로 통과.
- [ ] 수동 체크리스트: iPhone SE 375 / Galaxy 360 / iPad 768 / 데스크톱 1440.

## 5. 검증 기준

- 모든 페이지가 375px에서 가로 스크롤 없이 표시된다(칸반 보드는 예외적으로 탭 전환형).
- 터치 타겟 44×44 이상 확보(버튼, 링크, 체크박스).
- 텍스트는 `truncate`/`line-clamp`로 오버플로 제어.
- Lighthouse 모바일 accessibility ≥ 90 유지.
- e2e 전체 통과.

## 6. 비일정 / 비범위

- 네이티브 앱 전환(PWA 매니페스트, offline) — 별도 작업.
- 풀스크린 모바일 전용 UI(예: 하단 탭바) — 1차에서는 기존 사이드바 드로어 방식으로 통일, 필요 시 후속.
- 디자인 시스템 전면 리뉴얼(색상/타이포) — 이번 작업은 레이아웃/반응형 한정.

## 7. 커밋 전략

각 Phase마다 별도 커밋. 메시지 예:

```
feat(mobile): 레이아웃 셸 반응형 적용 (Phase 2)
feat(mobile): 이슈 목록 카드 뷰 추가 (Phase 4)
```

ADR은 Phase 6(칸반) 결정이 비자명하므로 별도 ADR로 남긴다: "ADR-XXX 칸반 보드 모바일 대응: DnD 대신 상태 select 사용".

## 8. 리스크

- **DnD + 모바일**: `@dnd-kit`의 `TouchSensor` 미도입 시 터치 드래그가 안 됨. Phase 6에서 활성화 여부 결정. 탭 전환형으로 회피하면 DnD는 기존 유지만으로 충분.
- **공통 컴포넌트 리팩토링 범위**: `ProjectTabs` 추출 시 5개 페이지를 한 커밋에서 수정 → 테스트 면적 넓어짐. Phase 3을 별도로 분리하여 위험 격리.
- **RichEditor 가로 스크롤**: 툴바가 잘릴 경우 폴백으로 접이식 more 메뉴 고려(후속).
