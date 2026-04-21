"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
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
          <h1 className="text-2xl font-bold text-gray-900">내 프로필</h1>
          <p className="text-sm text-gray-500 mt-1">
            GitHub 계정을 연결하면 내가 올린 PR이 머지될 때 이슈 상태 변경이
            내 이름으로 기록됩니다.
          </p>
        </div>

        {isLoading || !user ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
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
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setSuccessMsg("저장되었습니다.");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSuccessMsg(null);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        updateMutation.mutate({ githubLogin: githubLogin.trim() });
      }}
      className="bg-white p-6 rounded-lg border border-gray-200 space-y-5"
    >
      <div>
        <label
          htmlFor="user-email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이메일
        </label>
        <input
          id="user-email"
          value={user.email}
          disabled
          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
        />
      </div>

      <div>
        <label
          htmlFor="user-name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          이름
        </label>
        <input
          id="user-name"
          value={user.name}
          disabled
          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
        />
      </div>

      <div>
        <label
          htmlFor="user-github-login"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          GitHub 로그인
        </label>
        <input
          id="user-github-login"
          value={githubLogin}
          onChange={(e) => setGithubLogin(e.target.value)}
          placeholder="예: withwooyong"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">
          GitHub 프로필 URL의 슬래시 뒤 이름을 입력하세요 (예: github.com/
          <code>withwooyong</code>). 비워두면 매핑이 해제됩니다.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          {successMsg}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
