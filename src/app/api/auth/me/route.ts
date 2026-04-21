import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      githubLogin: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "사용자를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}

// GitHub 로그인 규칙: 영숫자와 하이픈, 연속 하이픈 금지, 양 끝 하이픈 금지, 1~39자
const githubLoginPattern =
  /^(?=.{1,39}$)[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  githubLogin: z
    .union([
      z.literal(""),
      z.string().regex(githubLoginPattern, {
        message: "GitHub 로그인 형식이 올바르지 않습니다.",
      }),
    ])
    .nullable()
    .optional(),
});

export async function PATCH(request: NextRequest) {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updateData: { name?: string; githubLogin?: string | null } = {};
    if (data.name !== undefined) updateData.name = data.name;
    if ("githubLogin" in data) {
      updateData.githubLogin = data.githubLogin ? data.githubLogin : null;
    }

    // 사전 중복 검사: 다른 사용자가 같은 githubLogin을 쓰고 있으면 409.
    // libSQL 어댑터 경유 Prisma 에러 코드가 환경별로 다를 수 있어 insert 전 명시 확인.
    if (updateData.githubLogin) {
      const conflict = await prisma.user.findUnique({
        where: { githubLogin: updateData.githubLogin },
        select: { id: true },
      });
      if (conflict && conflict.id !== payload.userId) {
        return NextResponse.json(
          { error: "이미 사용 중인 GitHub 로그인입니다." },
          { status: 409 }
        );
      }
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        githubLogin: true,
      },
    });

    return NextResponse.json({ user });
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
