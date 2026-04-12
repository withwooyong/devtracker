"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import Link from "next/link";
import type { Project } from "@/types/project";

export default function DashboardPage() {
  const { data, isLoading } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">대시보드</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.projects?.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.key}`}
                className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {project.key}
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <p className="text-xs text-gray-500">{project.key}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>이슈 {project._count?.issues ?? 0}개</span>
                  <span>배포 {project._count?.deployments ?? 0}개</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && (!data?.projects || data.projects.length === 0) && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">프로젝트가 없습니다.</p>
            <Link
              href="/projects"
              className="text-blue-600 hover:underline text-sm"
            >
              프로젝트 생성하기
            </Link>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
