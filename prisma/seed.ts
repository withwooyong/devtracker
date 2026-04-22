import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const prisma = new PrismaClient({ adapter });

const users = [
  { name: "허우용", email: "withwooyong@yanadoocorp.com", role: "ADMIN" },
  { name: "Harrison", email: "kookyh@yanadoocorp.com", role: "MEMBER" },
  { name: "Jonathan", email: "jonathan@yanadoocorp.com", role: "MEMBER" },
  { name: "Dior", email: "cj707.lee@yanadoocorp.com", role: "MEMBER" },
  { name: "Jerome", email: "jby@yanadoocorp.com", role: "MEMBER" },
  { name: "Linus", email: "hgjeong@yanadoocorp.com", role: "MEMBER" },
  { name: "Lucius", email: "hoddog@yanadoocorp.com", role: "MEMBER" },
  { name: "Marco", email: "marco@yanadoocorp.com", role: "MEMBER" },
  { name: "Miya", email: "seungmi93@yanadoocorp.com", role: "MEMBER" },
  { name: "Morgan", email: "clansim@yanadoocorp.com", role: "MEMBER" },
  { name: "Quokka", email: "alakoj@yanadoocorp.com", role: "MEMBER" },
] as const;

async function main() {
  const password = await bcrypt.hash("yanadoo123", 12);

  const createdUsers: Record<string, string> = {};

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: {
        email: u.email,
        password,
        name: u.name,
        role: u.role,
      },
    });
    createdUsers[u.name] = user.id;
  }

  // Sample project
  const project = await prisma.project.upsert({
    where: { key: "DEV" },
    update: {},
    create: {
      name: "야나두 개발",
      key: "DEV",
      description: "야나두 메인 서비스 개발 프로젝트",
      createdById: createdUsers["허우용"],
    },
  });

  const opsProject = await prisma.project.upsert({
    where: { key: "OPS" },
    update: {},
    create: {
      name: "인프라 운영",
      key: "OPS",
      description: "인프라 및 운영 관련 업무",
      createdById: createdUsers["허우용"],
    },
  });

  // Labels
  const labelData = [
    { name: "버그", color: "#ef4444" },
    { name: "기능", color: "#3b82f6" },
    { name: "개선", color: "#8b5cf6" },
    { name: "긴급", color: "#f97316" },
    { name: "문서", color: "#06b6d4" },
  ];

  for (const proj of [project, opsProject]) {
    for (const label of labelData) {
      await prisma.label.upsert({
        where: {
          projectId_name: { projectId: proj.id, name: label.name },
        },
        update: {},
        create: { ...label, projectId: proj.id },
      });
    }
  }

  // Sample issues
  const issues = [
    {
      title: "로그인 페이지 UI 개선",
      description: "로그인 폼 디자인을 리뉴얼합니다.",
      status: "DONE",
      priority: "MEDIUM",
      assigneeId: createdUsers["Harrison"],
      reporterId: createdUsers["허우용"],
      kanbanOrder: 0,
    },
    {
      title: "회원가입 이메일 인증 구현",
      description: "회원가입 시 이메일 인증 플로우를 추가합니다.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: createdUsers["Jonathan"],
      reporterId: createdUsers["허우용"],
      kanbanOrder: 0,
    },
    {
      title: "결제 API 오류 수정",
      description:
        "특정 카드사에서 결제 실패하는 버그를 수정합니다.\n\n## 재현 방법\n1. BC카드로 결제 시도\n2. 3D Secure 인증 후 에러 발생",
      status: "TODO",
      priority: "CRITICAL",
      assigneeId: createdUsers["Dior"],
      reporterId: createdUsers["Harrison"],
      kanbanOrder: 0,
    },
    {
      title: "대시보드 성능 최적화",
      description: "대시보드 로딩 시간을 3초 이내로 단축합니다.",
      status: "IN_REVIEW",
      priority: "MEDIUM",
      assigneeId: createdUsers["Jerome"],
      reporterId: createdUsers["허우용"],
      kanbanOrder: 0,
    },
    {
      title: "API 문서 업데이트",
      description: "Swagger 문서를 최신 API 스펙에 맞게 업데이트합니다.",
      status: "TODO",
      priority: "LOW",
      assigneeId: null,
      reporterId: createdUsers["허우용"],
      kanbanOrder: 1,
    },
    {
      title: "모바일 반응형 레이아웃 적용",
      description: "태블릿/모바일 해상도에서의 레이아웃 최적화",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: createdUsers["Linus"],
      reporterId: createdUsers["Miya"],
      kanbanOrder: 2,
    },
    {
      title: "사용자 프로필 이미지 업로드",
      description: "프로필 설정에서 아바타 이미지를 업로드할 수 있도록 합니다.",
      status: "IN_PROGRESS",
      priority: "LOW",
      assigneeId: createdUsers["Lucius"],
      reporterId: createdUsers["허우용"],
      kanbanOrder: 1,
    },
    {
      title: "알림 시스템 구현",
      description: "이슈 변경 시 담당자에게 알림을 보냅니다.",
      status: "TODO",
      priority: "HIGH",
      assigneeId: createdUsers["Marco"],
      reporterId: createdUsers["Morgan"],
      kanbanOrder: 3,
    },
  ];

  for (let i = 0; i < issues.length; i++) {
    const { assigneeId, ...rest } = issues[i];
    await prisma.issue.upsert({
      where: {
        projectId_issueNumber: { projectId: project.id, issueNumber: i + 1 },
      },
      update: {},
      create: {
        ...rest,
        projectId: project.id,
        issueNumber: i + 1,
        ...(assigneeId ? { assigneeId } : {}),
      },
    });
  }

  // Sample deployment
  const existingDeploy = await prisma.deployment.findFirst({
    where: { projectId: project.id, version: "v1.0.0" },
  });
  if (!existingDeploy) {
    await prisma.deployment.create({
      data: {
        projectId: project.id,
        version: "v1.0.0",
        environment: "PROD",
        status: "SUCCESS",
        description: "초기 릴리스",
        changes: "- 회원가입/로그인 기능\n- 메인 페이지\n- 결제 시스템 연동",
        deployedById: createdUsers["허우용"],
        deployedAt: new Date(),
      },
    });
  }

  console.log("Seed completed successfully!");
  console.log("비밀번호: yanadoo123 (모든 계정 동일)");
  for (const u of users) {
    console.log(`  ${u.role === "ADMIN" ? "[ADMIN]" : "[MEMBER]"} ${u.name}: ${u.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
