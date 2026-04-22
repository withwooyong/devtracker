"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { BurndownChart } from "@/components/common/burndown-chart";
import {
  type Sprint,
  type SprintStatus,
  SPRINT_STATUS_LABELS,
  SPRINT_STATUS_COLORS,
} from "@/types/sprint";
import type { Issue } from "@/types/issue";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function SprintDetailPage({
  params,
}: {
  params: Promise<{ projectKey: string; sprintId: string }>;
}) {
  const { projectKey, sprintId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: projectData } = useQuery<{
    project: { id: string; name: string; key: string };
  }>({
    queryKey: ["project", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const { data, isLoading } = useQuery<{ sprint: Sprint }>({
    queryKey: ["sprint", projectKey, sprintId],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/sprints/${sprintId}`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const { data: backlogData } = useQuery<{ issues: Issue[] }>({
    queryKey: ["backlog-issues", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/issues?sprintId=none&limit=200`).then(
        (r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.json();
        }
      ),
  });

  const updateSprint = useMutation({
    mutationFn: async (payload: Partial<{ status: SprintStatus }>) => {
      const res = await fetch(
        `/api/projects/${projectKey}/sprints/${sprintId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.error ?? "업데이트 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint", projectKey, sprintId] });
      queryClient.invalidateQueries({ queryKey: ["sprints", projectKey] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteSprint = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${projectKey}/sprints/${sprintId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.error ?? "삭제 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      router.push(`/projects/${projectKey}/sprints`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const assignIssue = useMutation({
    mutationFn: async ({
      issueId,
      sprintValue,
    }: {
      issueId: string;
      sprintValue: string | null;
    }) => {
      const res = await fetch(
        `/api/projects/${projectKey}/issues/${issueId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sprintId: sprintValue }),
        }
      );
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(p?.error ?? "이슈 할당 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint", projectKey, sprintId] });
      queryClient.invalidateQueries({ queryKey: ["backlog-issues", projectKey] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const sprint = data?.sprint;
  const issues = useMemo(() => sprint?.issues ?? [], [sprint?.issues]);

  const progress = useMemo(() => {
    if (!issues.length) return 0;
    const done = issues.filter((i) => i.status === "DONE").length;
    return Math.round((done / issues.length) * 100);
  }, [issues]);

  const backlogIssues = backlogData?.issues ?? [];

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link
            href={`/projects/${projectKey}/sprints`}
            className="hover:text-gray-700"
          >
            ← 스프린트 목록
          </Link>
        </div>

        {isLoading || !sprint ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-gray-900 truncate min-w-0 flex-1 md:flex-initial">
                      {sprint.name}
                    </h1>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${SPRINT_STATUS_COLORS[sprint.status]}`}
                    >
                      {SPRINT_STATUS_LABELS[sprint.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 break-words">
                    {projectData?.project?.name ?? projectKey} ·{" "}
                    {formatDate(sprint.startDate)} ~ {formatDate(sprint.endDate)}
                  </p>
                  {sprint.goal && (
                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap break-words">
                      {sprint.goal}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap md:flex-nowrap md:shrink-0">
                  {sprint.status === "PLANNED" && (
                    <button
                      onClick={() => updateSprint.mutate({ status: "ACTIVE" })}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                    >
                      스프린트 시작
                    </button>
                  )}
                  {sprint.status === "ACTIVE" && (
                    <button
                      onClick={() => updateSprint.mutate({ status: "COMPLETED" })}
                      className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 whitespace-nowrap"
                    >
                      스프린트 완료
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("스프린트를 삭제하시겠습니까? 포함된 이슈는 백로그로 이동됩니다.")) {
                        deleteSprint.mutate();
                      }
                    }}
                    className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 whitespace-nowrap"
                  >
                    삭제
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>진행률</span>
                  <span>
                    {issues.filter((i) => i.status === "DONE").length} / {issues.length} 완료 ({progress}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {error}
              </p>
            )}

            <div className="mb-4">
              <BurndownChart
                startDate={sprint.startDate}
                endDate={sprint.endDate}
                issues={issues}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">
                  포함된 이슈{" "}
                  <span className="text-gray-400 font-normal">
                    ({issues.length})
                  </span>
                </h2>
                <button
                  onClick={() => setShowAdd((v) => !v)}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
                >
                  {showAdd ? "닫기" : "이슈 추가"}
                </button>
              </div>

              {showAdd && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-2">
                    아직 스프린트에 속하지 않은 이슈
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {backlogIssues.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">
                        추가할 백로그 이슈가 없습니다.
                      </p>
                    ) : (
                      backlogIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5"
                        >
                          <span className="text-xs text-gray-400 shrink-0 w-12">
                            #{issue.issueNumber}
                          </span>
                          <span className="min-w-0 flex-1 text-sm text-gray-800 truncate">
                            {issue.title}
                          </span>
                          <button
                            onClick={() =>
                              assignIssue.mutate({
                                issueId: issue.id,
                                sprintValue: sprint.id,
                              })
                            }
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
                          >
                            추가
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {issues.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">
                  이 스프린트에 할당된 이슈가 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {issues.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
                          className="text-xs text-gray-400 shrink-0 hover:text-blue-600"
                        >
                          #{issue.issueNumber}
                        </Link>
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
                          className="min-w-0 flex-1 text-sm text-gray-800 truncate hover:text-blue-600"
                        >
                          {issue.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <StatusBadge status={issue.status} />
                        <PriorityBadge priority={issue.priority} />
                        <button
                          onClick={() =>
                            assignIssue.mutate({
                              issueId: issue.id,
                              sprintValue: null,
                            })
                          }
                          className="text-xs text-gray-400 hover:text-red-600 px-2 whitespace-nowrap"
                          title="스프린트에서 제거"
                        >
                          제거
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
