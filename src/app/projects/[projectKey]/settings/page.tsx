"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuthStore } from "@/stores/auth-store";
import type { Project } from "@/types/project";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const { user: authUser, isLoading: authLoading } = useAuthStore();

  const { data, isLoading } = useQuery<{ project: Project }>({
    queryKey: ["project", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const project = data?.project;
  const canEdit = Boolean(
    authUser &&
      project &&
      (authUser.role === "ADMIN" || project.createdById === authUser.id)
  );

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {project?.name ?? projectKey} 설정
            </h1>
            <div className="flex gap-3 mt-2 text-sm">
              <Link
                href={`/projects/${projectKey}`}
                className="text-gray-500 hover:text-gray-700 pb-1"
              >
                이슈 목록
              </Link>
              <Link
                href={`/projects/${projectKey}/board`}
                className="text-gray-500 hover:text-gray-700 pb-1"
              >
                칸반 보드
              </Link>
              <Link
                href={`/projects/${projectKey}/sprints`}
                className="text-gray-500 hover:text-gray-700 pb-1"
              >
                스프린트
              </Link>
              <Link
                href={`/projects/${projectKey}/deployments`}
                className="text-gray-500 hover:text-gray-700 pb-1"
              >
                배포 이력
              </Link>
              <Link
                href={`/projects/${projectKey}/settings`}
                className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
              >
                설정
              </Link>
            </div>
          </div>
        </div>

        {isLoading || authLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : !project ? (
          <p className="text-sm text-gray-500">프로젝트를 찾을 수 없습니다.</p>
        ) : !canEdit ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-sm">
            이 프로젝트의 설정을 편집할 권한이 없습니다. 관리자 또는 프로젝트
            생성자만 편집할 수 있습니다.
          </div>
        ) : (
          <SettingsForm key={project.id} project={project} projectKey={projectKey} />
        )}
      </div>
    </MainLayout>
  );
}

function SettingsForm({
  project,
  projectKey,
}: {
  project: Project;
  projectKey: string;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(project.description ?? "");
  const [githubRepo, setGithubRepo] = useState(project.githubRepo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectKey}`, {
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
      queryClient.invalidateQueries({ queryKey: ["project", projectKey] });
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
        updateMutation.mutate({
          description: description.trim(),
          githubRepo: githubRepo.trim(),
        });
      }}
      className="bg-white p-6 rounded-lg border border-gray-200 space-y-5"
    >
      <div>
        <label
          htmlFor="project-key"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          프로젝트 키
        </label>
        <input
          id="project-key"
          value={project.key}
          disabled
          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 text-gray-500 rounded-lg text-sm cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">키는 변경할 수 없습니다.</p>
      </div>

      <div>
        <label
          htmlFor="project-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          설명
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="프로젝트 설명을 입력하세요."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="project-github-repo"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          GitHub 레포지토리
        </label>
        <input
          id="project-github-repo"
          value={githubRepo}
          onChange={(e) => setGithubRepo(e.target.value)}
          placeholder="owner/repo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">
          &quot;owner/repo&quot; 형식으로 입력합니다. 비워두면 해당 프로젝트는
          webhook 연동 대상에서 제외됩니다.
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
          href={`/projects/${projectKey}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          취소
        </Link>
      </div>
    </form>
  );
}
