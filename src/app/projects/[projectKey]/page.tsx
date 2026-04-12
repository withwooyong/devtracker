"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import Link from "next/link";
import { StatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { useFilterStore } from "@/stores/filter-store";
import type { Issue, IssueStatus, IssuePriority } from "@/types/issue";
import type { User } from "@/types/user";

export default function ProjectIssuePage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const { status, priority, assigneeId, search, setStatus, setPriority, setAssigneeId, setSearch } =
    useFilterStore();

  const { data: projectData } = useQuery<{ project: { id: string; name: string; key: string } }>({
    queryKey: ["project", projectKey],
    queryFn: () => fetch(`/api/projects/${projectKey}`).then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
  });

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
  });

  const queryParams = new URLSearchParams();
  if (status !== "ALL") queryParams.set("status", status);
  if (priority !== "ALL") queryParams.set("priority", priority);
  if (assigneeId !== "ALL") queryParams.set("assigneeId", assigneeId);
  if (search) queryParams.set("search", search);

  const { data, isLoading } = useQuery<{ issues: Issue[]; total: number }>({
    queryKey: ["issues", projectKey, status, priority, assigneeId, search],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/issues?${queryParams}`).then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
  });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {projectData?.project?.name ?? projectKey}
            </h1>
            <div className="flex gap-3 mt-2 text-sm">
              <Link
                href={`/projects/${projectKey}`}
                className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
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
                href={`/projects/${projectKey}/deployments`}
                className="text-gray-500 hover:text-gray-700 pb-1"
              >
                배포 이력
              </Link>
            </div>
          </div>
          <Link
            href={`/projects/${projectKey}/issues/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            이슈 생성
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4 flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors w-48"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as IssueStatus | "ALL")}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          >
            <option value="ALL">모든 상태</option>
            <option value="TODO">할 일</option>
            <option value="IN_PROGRESS">진행 중</option>
            <option value="IN_REVIEW">리뷰 중</option>
            <option value="DONE">완료</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as IssuePriority | "ALL")}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          >
            <option value="ALL">모든 우선순위</option>
            <option value="CRITICAL">긴급</option>
            <option value="HIGH">높음</option>
            <option value="MEDIUM">보통</option>
            <option value="LOW">낮음</option>
          </select>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          >
            <option value="ALL">모든 담당자</option>
            {usersData?.users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 ml-auto">
            총 {data?.total ?? 0}개
          </span>
        </div>

        {/* Issue Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3 w-16">#</th>
                  <th className="px-4 py-3">제목</th>
                  <th className="px-4 py-3 w-24">상태</th>
                  <th className="px-4 py-3 w-24">우선순위</th>
                  <th className="px-4 py-3 w-28">담당자</th>
                  <th className="px-4 py-3 w-28">생성일</th>
                </tr>
              </thead>
              <tbody>
                {data?.issues?.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {projectKey}-{issue.issueNumber}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {issue.title}
                      </Link>
                      {issue.labels && issue.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {issue.labels.map((label) => (
                            <span
                              key={label.id}
                              className="inline-flex px-1.5 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: label.color + "20",
                                color: label.color,
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={issue.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={issue.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {issue.assignee?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))}
                {(!data?.issues || data.issues.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-500 text-sm"
                    >
                      이슈가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
