"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
import {
  type Sprint,
  SPRINT_STATUS_LABELS,
  SPRINT_STATUS_COLORS,
  type SprintStatus,
} from "@/types/sprint";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

const STATUS_ORDER: SprintStatus[] = ["ACTIVE", "PLANNED", "COMPLETED"];

export default function SprintListPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);

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

  const { data, isLoading } = useQuery<{ sprints: Sprint[] }>({
    queryKey: ["sprints", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/sprints`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const sprints = data?.sprints ?? [];
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: sprints.filter((s) => s.status === status),
  }));

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {projectData?.project?.name ?? projectKey}
            </h1>
            <ProjectTabs projectKey={projectKey} />
          </div>
          <Link
            href={`/projects/${projectKey}/sprints/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            스프린트 생성
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500">불러오는 중…</p>
        ) : sprints.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-sm text-gray-500">
              아직 스프린트가 없습니다. 첫 스프린트를 생성해 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ status, items }) =>
              items.length === 0 ? null : (
                <section key={status}>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">
                    {SPRINT_STATUS_LABELS[status]}{" "}
                    <span className="text-gray-400 font-normal">
                      ({items.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((sprint) => (
                      <Link
                        key={sprint.id}
                        href={`/projects/${projectKey}/sprints/${sprint.id}`}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-gray-900 truncate min-w-0 flex-1">
                            {sprint.name}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${SPRINT_STATUS_COLORS[sprint.status]}`}
                          >
                            {SPRINT_STATUS_LABELS[sprint.status]}
                          </span>
                        </div>
                        {sprint.goal && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2 break-words">
                            {sprint.goal}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-3 text-xs text-gray-500">
                          <span className="whitespace-nowrap">
                            {formatDate(sprint.startDate)} ~{" "}
                            {formatDate(sprint.endDate)}
                          </span>
                          <span className="whitespace-nowrap">이슈 {sprint._count?.issues ?? 0}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
