import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
