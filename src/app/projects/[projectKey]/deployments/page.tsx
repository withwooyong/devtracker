"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import {
  DeployStatusBadge,
  EnvBadge,
} from "@/components/common/status-badge";
import Link from "next/link";
import type { Deployment, DeployEnvironment } from "@/types/deployment";

export default function DeploymentsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const [envFilter, setEnvFilter] = useState<DeployEnvironment | "ALL">("ALL");

  const { data: projectData } = useQuery<{
    project: { id: string; name: string };
  }>({
    queryKey: ["project", projectKey],
    queryFn: () => fetch(`/api/projects/${projectKey}`).then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
  });

  const queryParams = envFilter !== "ALL" ? `?environment=${envFilter}` : "";

  const { data, isLoading } = useQuery<{ deployments: Deployment[] }>({
    queryKey: ["deployments", projectKey, envFilter],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/deployments${queryParams}`).then((r) =>
        r.json()
      ),
  });

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {projectData?.project?.name ?? projectKey} - 배포 이력
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
                className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
              >
                배포 이력
              </Link>
            </div>
          </div>
          <Link
            href={`/projects/${projectKey}/deployments/new`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            배포 기록
          </Link>
        </div>

        {/* Env filter */}
        <div className="mb-4 flex gap-2">
          {(["ALL", "DEV", "STAGING", "PROD"] as const).map((env) => (
            <button
              key={env}
              onClick={() => setEnvFilter(env)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                envFilter === env
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {env === "ALL" ? "전체" : env}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {data?.deployments?.map((dep) => (
              <div
                key={dep.id}
                className="bg-white p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">
                      {dep.version}
                    </span>
                    <EnvBadge env={dep.environment} />
                    <DeployStatusBadge status={dep.status} />
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(dep.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                {dep.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {dep.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>배포자: {dep.deployedBy?.name ?? "-"}</span>
                  {dep.deployedAt && (
                    <span>
                      | 배포 시간:{" "}
                      {new Date(dep.deployedAt).toLocaleString("ko-KR")}
                    </span>
                  )}
                </div>
                {dep.changes && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer">
                      변경사항 보기
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {dep.changes}
                    </pre>
                  </details>
                )}
              </div>
            ))}
            {(!data?.deployments || data.deployments.length === 0) && (
              <div className="text-center py-12 text-gray-500 text-sm">
                배포 이력이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
