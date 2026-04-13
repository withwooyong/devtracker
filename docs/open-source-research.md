# DevTracker 유사 오픈소스 리서치

> 조사일: 2026-04-13
> 목적: DevTracker와 유사한 오픈소스 프로젝트 관리 도구를 분석하여 추가 기능 방향 도출

## 조사 대상 프로젝트

### 1. Plane (makeplane/plane)

- **GitHub**: https://github.com/makeplane/plane
- **Stars**: ~47,700
- **스택**: TypeScript, React (React Router + Vite), Django (Python), PostgreSQL, Redis
- **특징**:
  - 스프린트/사이클: 기간 설정 + 번다운 차트로 팀 속도 추적
  - 모듈(에픽): 여러 스프린트에 걸친 대규모 작업 그룹핑
  - 글로벌 뷰: 모든 프로젝트의 이슈를 한 곳에서 커스텀 필터로 조회
  - 프로젝트 내 문서/위키 에디터
  - GitHub 양방향 연동 (이슈 ↔ GitHub Issues)
  - Slack 알림 연동
  - Gantt 차트 뷰
  - Triage / Inbox: 들어오는 이슈를 수락 전 대기열에 보관
- **참고 포인트**: 가장 많은 스타를 받은 오픈소스 Jira 대안. 사이클 + 모듈 시스템이 DevTracker에 가장 필요한 기능

### 2. Focalboard (mattermost-community/focalboard)

- **GitHub**: https://github.com/mattermost-community/focalboard
- **Stars**: ~26,000
- **스택**: TypeScript (프론트), Go (백엔드), React, PostgreSQL/SQLite
- **특징**:
  - 다중 뷰: Board, Table, Gallery, Calendar 뷰를 같은 데이터에 적용
  - 템플릿: 미팅 노트, 로드맵 등 미리 만들어진 보드 템플릿
  - 다국어(i18n) 지원
  - 커스텀 속성 타입: select, multi-select, date, person, checkbox, URL 등
  - Mattermost 채팅 연동
  - 카드 내 리치 콘텐츠 (이미지, 체크박스, 구분선)
- **참고 포인트**: "Notion 스타일" 접근. 카드가 유연한 문서 형태. SQLite 백엔드 옵션이 DevTracker와 동일

### 3. Huly (hcengineering/platform)

- **GitHub**: https://github.com/hcengineering/platform
- **Stars**: ~25,300
- **스택**: TypeScript (150+ 패키지, Rush.js 모노레포), Svelte, MongoDB 기반 리액티브 레이어
- **특징**:
  - 올인원 플랫폼: PM + 실시간 채팅 + 문서 + HR/CRM (Linear + Slack + Notion 결합)
  - 실시간 멀티플레이어 협업 편집
  - 시간 추적 (이슈별 타임 로깅)
  - 플러그인 아키텍처: 각 기능(채팅, PM, HR)이 독립 플러그인
  - Electron 데스크톱 앱
  - GitHub/GitLab 연동 (커밋에서 이슈 자동 링크)
- **참고 포인트**: 가장 야심찬 올인원 대안. 플러그인 아키텍처와 실시간 동기화 엔진이 기술적으로 인상적

### 4. Planka (plankanban/planka)

- **GitHub**: https://github.com/plankanban/planka
- **Stars**: ~11,800
- **스택**: JavaScript/React + Redux (프론트), Node.js + Sails.js (백엔드), PostgreSQL
- **특징**:
  - 실시간 칸반: WebSocket으로 모든 보드 변경 실시간 동기화
  - Webhook / API: 외부 서비스 연동용 웹훅
  - 카드 첨부파일: 이슈에 파일 직접 업로드
  - 카드 타이머/스톱워치: 이슈별 시간 추적
  - 보드 배경 커스터마이징
  - 마크다운 지원
- **참고 포인트**: DevTracker와 정신이 가장 유사 — 소규모 팀용 경량 칸반. WebSocket 실시간 동기화가 가장 큰 차별점

### 5. oldboyxx/jira_clone

- **GitHub**: https://github.com/oldboyxx/jira_clone
- **Stars**: ~11,000
- **스택**: React/Babel (클라이언트), Node.js/TypeScript (API), TypeORM, PostgreSQL, Cypress
- **특징**:
  - 고급 이슈 검색: 실시간 결과와 JQL 유사 필터링 모달
  - 리치 텍스트 에디터: 볼드, 리스트, 이미지, 코드블록 등
  - 이슈 활동 로그: 누가 무엇을 변경했는지 전체 히스토리 타임라인
  - 옵티미스틱 업데이트: 서버 확인 전 UI 즉시 반영
  - Cypress E2E 테스트
- **참고 포인트**: 유지보수는 중단되었지만 React 코드베이스 구조가 우수. 활동 로그와 리치 텍스트 에디터 패턴이 DevTracker에 직접 적용 가능

### 6. Tegon (RedPlanetHQ/tegon)

- **GitHub**: https://github.com/RedPlanetHQ/tegon
- **Stars**: ~1,900
- **스택**: TypeScript, **Next.js** (프론트), **NestJS** (백엔드), PostgreSQL, **Prisma**
- **특징**:
  - AI 기능: 설명에서 이슈 제목 자동 생성, 라벨/담당자 AI 추천, 중복 이슈 자동 감지
  - 자동화/액션: 생성 시 자동 라벨, PR 생성 시 하위 이슈 생성, Slack 이모지로 이슈 생성
  - Sentry 연동: 에러를 이슈에 직접 연결
  - GitHub 양방향 연동: PR 상태에 따라 이슈 상태 자동 변경
  - Slack 봇: 이모지 반응으로 이슈 생성
  - 커스텀 뷰 + 저장된 필터
- **참고 포인트**: DevTracker와 **가장 유사한 스택** (Next.js + Prisma + TypeScript). AI 기능이 PM 도구의 최전선. NestJS 백엔드는 API routes 한계 시 참고할 아키텍처

### 7. sebastianfdz/jira_clone

- **GitHub**: https://github.com/sebastianfdz/jira_clone
- **Stars**: ~200
- **스택**: **Next.js 13**, React Server Components, **React Query (TanStack Query)**, **Prisma**, TypeScript, **Tailwind CSS**
- **특징**:
  - React Server Components 활용: 데이터 집약 페이지에 RSC 적용
  - React Query 캐싱: 클라이언트 데이터 캐싱 + 무효화 전략
  - 옵티미스틱 뮤테이션: React Query의 onMutate/onError/onSettled 패턴
- **참고 포인트**: DevTracker와 **거의 동일한 스택**. 코드 패턴을 직접 참고하기 가장 좋은 레포. RSC + React Query 하이브리드 접근이 적용 가능

## DevTracker 기능 로드맵 제안

현재 DevTracker에 없는 기능 중, 유사 프로젝트들이 공통적으로 제공하는 기능 우선순위:

| 순위 | 기능 | 설명 | 난이도 | 참고 프로젝트 |
|------|------|------|--------|--------------|
| 1 | **스프린트/사이클** | 기간 설정, 이슈 할당, 번다운 차트 | 높음 | Plane |
| 2 | **리치 텍스트 에디터** | 이슈 설명에 마크다운/이미지/코드블록 | 중간 | oldboyxx/jira_clone |
| 3 | **이슈 활동 로그** | 변경 히스토리 타임라인 (상태, 담당자, 우선순위) | 중간 | oldboyxx/jira_clone |
| 4 | **실시간 업데이트** | WebSocket으로 칸반/이슈 실시간 동기화 | 높음 | Planka |
| 5 | **파일 첨부** | 이슈에 이미지/파일 업로드 (S3 or Vercel Blob) | 중간 | Planka, Focalboard |
| 6 | **저장된 필터/커스텀 뷰** | 자주 쓰는 필터 조합 저장 후 재사용 | 낮음 | Plane, Tegon |
| 7 | **GitHub 연동** | PR ↔ 이슈 자동 연결, PR 머지 시 이슈 상태 변경 | 높음 | Plane, Tegon |
| 8 | **알림 시스템** | 이슈 변경/댓글 시 담당자 알림 (인앱 + 이메일) | 중간 | Plane, Huly |
| 9 | **캘린더 뷰** | 마감일 기반 이슈 캘린더 표시 | 낮음 | Focalboard |
| 10 | **AI 기능** | 자동 라벨 추천, 중복 이슈 감지, 제목 자동 생성 | 높음 | Tegon |

### 단기 추천 (빠르게 구현 가능)

1. **리치 텍스트 에디터** — tiptap 또는 @uiw/react-md-editor 도입
2. **이슈 활동 로그** — Activity 모델 추가, 이슈 변경 시 자동 기록
3. **저장된 필터** — 현재 filter-store를 DB에 저장하는 기능

### 중기 추천 (아키텍처 변경 수반)

4. **스프린트/사이클** — Sprint 모델 + 이슈 연결 + 번다운 차트
5. **파일 첨부** — Vercel Blob 또는 Cloudflare R2 연동
6. **알림 시스템** — Notification 모델 + 인앱 알림 UI

### 장기 추천 (외부 연동)

7. **GitHub 연동** — GitHub App/Webhook으로 PR ↔ 이슈 동기화
8. **실시간 업데이트** — Pusher 또는 Ably 연동
9. **AI 기능** — Claude API로 라벨 추천, 중복 감지
