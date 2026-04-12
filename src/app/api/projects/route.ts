import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { issues: true, deployments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

const createSchema = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, "프로젝트 키는 영문 대문자로 시작해야 합니다."),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, key, description } = createSchema.parse(body);

    const existing = await prisma.project.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json(
        { error: "이미 사용 중인 프로젝트 키입니다." },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: { name, key, description, createdById: user.userId },
      include: { _count: { select: { issues: true, deployments: true } } },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력값이 올바르지 않습니다.", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
