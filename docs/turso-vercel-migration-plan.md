# 작업계획서: Turso + Vercel 배포 마이그레이션

## 목표

DevTracker를 로컬 SQLite(better-sqlite3) → Turso(libSQL) + Vercel 무료 배포로 전환한다.

## 배경

- 현재: SQLite 파일(`prisma/dev.db`) 기반, 로컬에서만 동작
- 문제: Vercel은 서버리스 환경으로 파일 시스템이 배포마다 초기화됨 → SQLite 사용 불가
- 해결: Turso(libSQL = SQLite 포크, 클라우드 호스팅) + Vercel 무료 조합

## 기술 스택 변경

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| DB | SQLite (`prisma/dev.db`) | Turso (libSQL, 클라우드) |
| 어댑터 | `@prisma/adapter-better-sqlite3` | `@prisma/adapter-libsql` |
| 클라이언트 | `better-sqlite3` | `@libsql/client` |
| 어댑터 클래스 | `PrismaBetterSqlite3` | `PrismaLibSQL` |
| Schema URL | `file:./dev.db` | `env("TURSO_DATABASE_URL")` |
| 인증 | 없음 | `env("TURSO_AUTH_TOKEN")` |
| 호스팅 | 로컬 | Vercel (무료) |
| 스키마 provider | `sqlite` (변경 없음) | `sqlite` (변경 없음) |

## 작업 단계

### Phase 1: Turso DB 생성 및 설정

**1-1. Turso CLI 설치 및 로그인**
```bash
brew install tursodatabase/tap/turso
turso auth login
```

**1-2. 데이터베이스 생성**
```bash
turso db create devtracker
turso db show devtracker --url      # → libsql://devtracker-xxx.turso.io
turso db tokens create devtracker   # → JWT 토큰
```

**1-3. 환경변수 설정 (`.env.local`)**
```env
TURSO_DATABASE_URL="libsql://devtracker-xxx.turso.io"
TURSO_AUTH_TOKEN="<JWT 토큰>"
JWT_SECRET="<기존 유지>"
JWT_REFRESH_SECRET="<기존 유지>"
```

### Phase 2: 의존성 교체

**2-1. 패키지 설치/제거**
```bash
pnpm add @prisma/adapter-libsql @libsql/client
pnpm remove @prisma/adapter-better-sqlite3 better-sqlite3 @types/better-sqlite3
```

**2-2. `package.json` — `pnpm.onlyBuiltDependencies`에서 `better-sqlite3` 제거**

### Phase 3: Prisma 설정 변경

**3-1. `prisma/schema.prisma` 수정**

변경 전:
```prisma
datasource db {
  provider = "sqlite"
}
```

변경 후:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("TURSO_DATABASE_URL")
}
```

> `provider`는 `"sqlite"` 유지 (libSQL은 SQLite 호환)

**3-2. `src/lib/prisma.ts` 수정**

변경 전:
```typescript
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

function createPrismaClient() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter });
}
```

변경 후:
```typescript
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

function createPrismaClient() {
  const libsql = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}
```

**3-3. `prisma/seed.ts` 수정**

변경 전:
```typescript
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const dbPath = path.join(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
```

변경 후:
```typescript
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const adapter = new PrismaLibSQL(libsql);
```

### Phase 4: 스키마 푸시 및 시드

```bash
# Prisma 클라이언트 재생성
npx prisma generate

# 스키마를 Turso에 반영
npx prisma db push

# 시드 데이터 삽입
npx tsx prisma/seed.ts
```

### Phase 5: 로컬 검증

```bash
# dev 서버 실행
pnpm dev

# 검증 항목:
# 1. /login → 로그인 성공
# 2. /dashboard → 프로젝트 카드 표시
# 3. 이슈 생성/수정/삭제
# 4. 칸반 보드 드래그 앤 드롭
# 5. 배포 기록 생성
```

E2E 테스트 실행:
```bash
npx playwright test
```

### Phase 6: Vercel 배포

**6-1. Vercel 프로젝트 연결**
```bash
npx vercel link
```

**6-2. 환경변수 설정 (Vercel 대시보드 또는 CLI)**
```bash
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add JWT_SECRET
vercel env add JWT_REFRESH_SECRET
```

**6-3. 배포**
```bash
vercel --prod
```

**6-4. 배포 후 검증**
- Vercel URL 접속 → 로그인 → 대시보드 확인
- API 응답 정상 확인

### Phase 7: 정리

- `.env.local`에서 `DATABASE_URL` 제거 (더 이상 사용 안 함)
- `CLAUDE.md` 배포 관련 내용 업데이트
- `.gitignore`에 `prisma/dev.db` 유지 (로컬 개발용 잔여 파일)

## 수정 대상 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `package.json` | 의존성 교체, onlyBuiltDependencies 수정 |
| `prisma/schema.prisma` | `url = env("TURSO_DATABASE_URL")` 추가 |
| `src/lib/prisma.ts` | 어댑터 교체 (BetterSqlite3 → LibSQL) |
| `prisma/seed.ts` | 어댑터 교체 |
| `.env.local` | Turso URL/토큰 추가 |

## 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| Turso 무료 티어 제한 초과 | 500M 읽기/월 | 5~20명 팀 규모에서 초과 가능성 극히 낮음 |
| libSQL과 SQLite 미세 차이 | 일부 쿼리 비호환 | Prisma ORM이 추상화하므로 실질적 영향 없음 |
| Vercel 서버리스 cold start | 첫 요청 느림 | 내부 도구이므로 허용 가능 |
| Turso 서비스 장애 | DB 접속 불가 | 로컬 dev.db로 개발 환경 fallback 가능 |

## 예상 소요

코드 변경 자체는 파일 5개, 총 20줄 미만 수정.
Turso DB 생성 + Vercel 배포 설정이 주요 시간 소요.
