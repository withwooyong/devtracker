"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@/types/user";

export default function UserSettingsPage() {
  const { data, isLoading } = useQuery<{ user: User }>({
    queryKey: ["auth", "me"],
    queryFn: () =>
      fetch("/api/auth/me").then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const user = data?.user;

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            내 프로필
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            GitHub 계정을 연결하면 내가 올린 PR이 머지될 때 이슈 상태 변경이 내
            이름으로 기록됩니다.
          </p>
        </div>

        {isLoading || !user ? (
          <Card>
            <CardContent className="space-y-5 py-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-24" />
            </CardContent>
          </Card>
        ) : (
          <ProfileForm key={user.id} user={user} />
        )}
      </div>
    </MainLayout>
  );
}

function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [githubLogin, setGithubLogin] = useState(user.githubLogin ?? "");

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const detail = Array.isArray(payload?.details)
          ? payload.details
              .map((d: { message?: string }) => d.message)
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(detail || payload?.error || "저장 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("저장되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate({ githubLogin: githubLogin.trim() });
          }}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="user-email">이메일</Label>
            <Input id="user-email" value={user.email} disabled readOnly />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-name">이름</Label>
            <Input id="user-name" value={user.name} disabled readOnly />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-github-login">GitHub 로그인</Label>
            <Input
              id="user-github-login"
              value={githubLogin}
              onChange={(e) => setGithubLogin(e.target.value)}
              placeholder="예: withwooyong"
            />
            <p className="text-xs text-muted-foreground">
              GitHub 프로필 URL의 슬래시 뒤 이름을 입력하세요 (예: github.com/
              <code className="font-mono">withwooyong</code>). 비워두면 매핑이
              해제됩니다.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">취소</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
