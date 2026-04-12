import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "리프레시 토큰이 없습니다." },
      { status: 401 }
    );
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json(
      { error: "유효하지 않은 리프레시 토큰입니다." },
      { status: 401 }
    );
  }

  const newPayload = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  };

  const newAccessToken = generateAccessToken(newPayload);
  const newRefreshToken = generateRefreshToken(newPayload);

  cookieStore.set("access_token", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });

  cookieStore.set("refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.json({ success: true });
}
