"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const body = isRegister
        ? { email, password, name }
        : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "오류가 발생했습니다.");
        return;
      }

      setUser(data.user);
      router.push("/dashboard");
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-6">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="space-y-6 py-2">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              DevTracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              개발 업무 관리 시스템
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <Label htmlFor="login-name">이름</Label>
                <Input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="login-email">이메일</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password">비밀번호</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                required
                minLength={isRegister ? 6 : 1}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "처리 중..." : isRegister ? "회원가입" : "로그인"}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister
                ? "이미 계정이 있으신가요? 로그인"
                : "계정이 없으신가요? 회원가입"}
            </Button>
          </div>

          <Separator />

          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-0.5">
            <p className="font-medium mb-1 text-foreground">
              테스트 계정 (비밀번호: yanadoo123)
            </p>
            <p>관리자: withwooyong@yanadoocorp.com (허우용)</p>
            <p>멤버: kookyh@yanadoocorp.com (Harrison)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
