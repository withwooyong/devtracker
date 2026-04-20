# 작업계획서: DevTracker 기능 고도화 (Phase 1~3)

## 목표

DevTracker에 핵심 기능을 단계적으로 추가하여 실사용 가능한 프로젝트 관리 도구로 발전시킨다.

## 전체 로드맵

| Phase | 기능 | 난이도 | 상태 |
|-------|------|--------|------|
| **Phase 1** | 리치 텍스트 에디터 + 이슈 활동 로그 + 저장된 필터 | 낮음~중간 | ✅ 완료 (2026-04-13) |
| **Phase 2** | 스프린트/사이클 + 알림 시스템 | 중간~높음 | ✅ 완료 (2026-04-20) |
| **Phase 3** | 파일 첨부 + GitHub 연동 | 높음 | ✅ 완료 (2026-04-20) |

> 추가 분리 이슈(Private Blob 마이그레이션, 백로그 필터, 알림 Outbox)도 모두 완료.
> 결정 기록: `docs/ADR.md` ADR-013~018

---

## Phase 1: 핵심 UX 개선 (기존 구조 확장)

### 1-1. 리치 텍스트 에디터

**목적**: 이슈 설명과 댓글에 마크다운/리치 텍스트 지원

**기술 선택**: tiptap (헤드리스 에디터, React 지원, MIT 라이선스)

**설치**:
```bash
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-code-block-lowlight
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `src/components/common/rich-editor.tsx` | 신규 — tiptap 에디터 컴포넌트 |
| `src/app/projects/[projectKey]/issues/new/page.tsx` | textarea → RichEditor 교체 |
| `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx` | 이슈 설명 표시를 HTML 렌더링으로 변경, 댓글 입력에 에디터 적용 |

**데이터 포맷**: description/content를 HTML 문자열로 저장 (DB 스키마 변경 없음, 기존 String 필드 그대로 사용)

**에디터 기능**:
- 볼드, 이탤릭, 취소선
- 헤딩 (H1~H3)
- 불릿/번호 리스트
- 코드 블록 (구문 강조)
- 인라인 코드
- 링크
- 인용문

---

### 1-2. 이슈 활동 로그

**목적**: 이슈의 모든 변경 이력을 타임라인으로 표시

**DB 스키마 추가**:

```prisma
model Activity {
  id        String   @id @default(uuid())
  issueId   String
  userId    String
  action    String   // STATUS_CHANGED | PRIORITY_CHANGED | ASSIGNEE_CHANGED | LABEL_ADDED | LABEL_REMOVED | COMMENT_ADDED | CREATED
  field     String?  // 변경된 필드명 (status, priority, assigneeId 등)
  oldValue  String?  // 이전 값
  newValue  String?  // 새 값
  createdAt DateTime @default(now())

  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])
}
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | Activity 모델 추가, Issue/User에 relation 추가 |
| `src/types/activity.ts` | 신규 — Activity 타입 + action 상수 |
| `src/app/api/projects/[projectId]/issues/[issueId]/route.ts` | PATCH 시 변경된 필드 감지 → Activity 레코드 생성 |
| `src/app/api/projects/[projectId]/issues/[issueId]/activities/route.ts` | 신규 — GET 활동 로그 API |
| `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx` | 댓글 탭 옆에 "활동" 탭 추가, 타임라인 UI |
| `src/components/common/activity-timeline.tsx` | 신규 — 활동 로그 타임라인 컴포넌트 |

**활동 기록 대상**:
- 이슈 생성
- 상태 변경 (TODO → IN_PROGRESS 등)
- 우선순위 변경
- 담당자 변경/해제
- 라벨 추가/제거
- 댓글 작성

**UI**: 댓글과 활동을 시간순으로 합쳐서 하나의 타임라인으로 표시 (GitHub Issues 스타일)

---

### 1-3. 저장된 필터 (커스텀 뷰)

**목적**: 자주 사용하는 필터 조합을 저장하고 한 번에 적용

**DB 스키마 추가**:

```prisma
model SavedFilter {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  name      String
  filters   String   // JSON 문자열: { status, priority, assigneeId, search }
  isShared  Boolean  @default(false)
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])
}
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | SavedFilter 모델 추가 |
| `src/types/filter.ts` | 신규 — SavedFilter 타입 |
| `src/app/api/projects/[projectId]/filters/route.ts` | 신규 — CRUD API (GET/POST) |
| `src/app/api/projects/[projectId]/filters/[filterId]/route.ts` | 신규 — DELETE API |
| `src/app/projects/[projectKey]/page.tsx` | 필터 바에 "저장" 버튼 + 저장된 필터 드롭다운 추가 |

**동작**:
1. 필터 설정 후 "필터 저장" 클릭 → 이름 입력 → 저장
2. 필터 바에 저장된 필터 목록 드롭다운 표시
3. 클릭하면 해당 필터 즉시 적용
4. `isShared: true`면 같은 프로젝트 팀원도 사용 가능

---

## Phase 2: 프로젝트 관리 강화

### 2-1. 스프린트/사이클

**목적**: 기간 기반 작업 단위로 이슈를 그룹핑하고 진행 상황 추적

**DB 스키마 추가**:

```prisma
model Sprint {
  id          String    @id @default(uuid())
  projectId   String
  name        String
  goal        String?
  startDate   DateTime
  endDate     DateTime
  status      String    @default("PLANNED") // PLANNED | ACTIVE | COMPLETED
  createdById String
  createdAt   DateTime  @default(now())

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy User    @relation("SprintCreator", fields: [createdById], references: [id])
  issues    Issue[]
}
```

**Issue 모델 변경**:
```prisma
model Issue {
  // 기존 필드...
  sprintId String?
  sprint   Sprint? @relation(fields: [sprintId], references: [id])
}
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | Sprint 모델 추가, Issue에 sprintId 추가 |
| `src/types/sprint.ts` | 신규 — Sprint 타입 + 상수 |
| `src/app/api/projects/[projectId]/sprints/route.ts` | 신규 — GET(목록)/POST(생성) |
| `src/app/api/projects/[projectId]/sprints/[sprintId]/route.ts` | 신규 — GET/PATCH/DELETE |
| `src/app/projects/[projectKey]/sprints/page.tsx` | 신규 — 스프린트 목록 + 번다운 차트 |
| `src/app/projects/[projectKey]/sprints/new/page.tsx` | 신규 — 스프린트 생성 폼 |
| `src/app/projects/[projectKey]/sprints/[sprintId]/page.tsx` | 신규 — 스프린트 상세 (이슈 목록 + 진행률) |
| `src/components/common/burndown-chart.tsx` | 신규 — 번다운 차트 (SVG 또는 recharts) |
| `src/components/layout/sidebar.tsx` | 네비게이션에 "스프린트" 메뉴 추가 |

**스프린트 플로우**:
1. 스프린트 생성 (이름, 기간, 목표)
2. 이슈를 스프린트에 할당 (이슈 목록/칸반에서 드래그 또는 선택)
3. 스프린트 시작 → status: ACTIVE
4. 번다운 차트로 진행 상황 추적
5. 스프린트 완료 → 미완료 이슈는 다음 스프린트로 이동 또는 백로그

**번다운 차트**: 일별 남은 이슈 수/스토리포인트를 선 그래프로 표시

---

### 2-2. 알림 시스템

**목적**: 이슈 변경 시 관련자에게 인앱 알림

**DB 스키마 추가**:

```prisma
model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String   // ISSUE_ASSIGNED | ISSUE_STATUS_CHANGED | COMMENT_ADDED | SPRINT_STARTED | MENTIONED
  title     String
  message   String
  link      String   // 클릭 시 이동할 URL
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | Notification 모델 추가 |
| `src/types/notification.ts` | 신규 — Notification 타입 |
| `src/lib/notification.ts` | 신규 — 알림 생성 헬퍼 함수 |
| `src/app/api/notifications/route.ts` | 신규 — GET(목록)/PATCH(읽음 처리) |
| `src/components/layout/header.tsx` | 알림 벨 아이콘 + 드롭다운 추가 |
| `src/components/common/notification-dropdown.tsx` | 신규 — 알림 목록 UI |

**알림 트리거**:
- 이슈가 나에게 할당됨
- 내가 담당인 이슈의 상태 변경
- 내가 보고한 이슈에 댓글 추가
- 스프린트 시작/종료
- 댓글에서 @멘션 (추후)

---

## Phase 3: 외부 연동

### 3-1. 파일 첨부

**목적**: 이슈에 이미지/파일 업로드

**기술 선택**: Vercel Blob (Vercel 무료 티어에 포함, S3 호환)

**설치**:
```bash
pnpm add @vercel/blob
```

**DB 스키마 추가**:

```prisma
model Attachment {
  id        String   @id @default(uuid())
  issueId   String
  userId    String
  filename  String
  url       String
  size      Int
  mimeType  String
  createdAt DateTime @default(now())

  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id])
}
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | Attachment 모델 추가 |
| `src/app/api/projects/[projectId]/issues/[issueId]/attachments/route.ts` | 신규 — GET/POST (업로드) |
| `src/components/common/file-upload.tsx` | 신규 — 드래그앤드롭 파일 업로드 UI |
| `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx` | 첨부파일 섹션 추가 |

### 3-2. GitHub 연동

**목적**: PR ↔ 이슈 자동 연결, PR 머지 시 이슈 상태 변경

**구현 방식**: GitHub Webhook 수신

**DB 스키마 추가**:

```prisma
model GitHubLink {
  id        String   @id @default(uuid())
  issueId   String
  type      String   // PR | COMMIT | BRANCH
  url       String
  title     String
  status    String?  // open | closed | merged
  createdAt DateTime @default(now())

  issue Issue @relation(fields: [issueId], references: [id], onDelete: Cascade)
}
```

**변경 사항**:

| 파일 | 변경 |
|------|------|
| `prisma/schema.prisma` | GitHubLink 모델 추가 |
| `src/app/api/webhooks/github/route.ts` | 신규 — GitHub Webhook 수신 (PR 이벤트) |
| `src/app/projects/[projectKey]/issues/[issueNumber]/page.tsx` | GitHub 링크 섹션 추가 |
| `src/app/projects/[projectKey]/settings/page.tsx` | 신규 — GitHub 레포 연결 설정 |

**연동 규칙**:
- PR 제목이나 브랜치명에 `DEV-123` 형태의 이슈 키가 포함되면 자동 연결
- PR 머지 시 연결된 이슈 상태를 DONE으로 변경 (설정 가능)

---

## 구현 순서 요약

```
Phase 1 (기존 구조 확장)
├── 1-1. 리치 텍스트 에디터 (독립적)
├── 1-2. 이슈 활동 로그 (독립적)
└── 1-3. 저장된 필터 (독립적)
    → 3개 모두 병렬 작업 가능

Phase 2 (새 모델 + UI)
├── 2-1. 스프린트/사이클 (독립적)
└── 2-2. 알림 시스템 (활동 로그 이후 구현 권장)
    → 2개 순차 작업 (알림은 활동 로그 인프라 활용)

Phase 3 (외부 연동)
├── 3-1. 파일 첨부 (독립적)
└── 3-2. GitHub 연동 (독립적)
    → 2개 병렬 작업 가능
```

## DB 스키마 변경 요약

| Phase | 새 모델 | 기존 모델 변경 |
|-------|---------|---------------|
| 1 | Activity, SavedFilter | Issue(activities relation), User(activities relation) |
| 2 | Sprint, Notification | Issue(sprintId 추가), User(sprints, notifications relation) |
| 3 | Attachment, GitHubLink | Issue(attachments, githubLinks relation), User(attachments relation) |
