import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "fallback-refresh";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (accessToken) {
    try {
      jwt.verify(accessToken, JWT_SECRET);
      return NextResponse.next();
    } catch {
      // Access token invalid/expired
    }
  }

  if (refreshToken) {
    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      return NextResponse.next();
    } catch {
      // Refresh token also invalid
    }
  }

  // Not authenticated
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
