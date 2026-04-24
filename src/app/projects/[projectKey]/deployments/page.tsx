"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
import {
  DeployStatusBadge,
  EnvBadge,
} from "@/components/common/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { Deployment, DeployEnvironment } from "@/types/deployment";

const ENV_FILTERS = ["ALL", "DEV", "STAGING", "PROD"] as const;

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
    queryFn: () =>
      fetch(`/api/projects/${projectKey}`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const queryParams = envFilter !== "ALL" ? `?environment=${envFilter}` : "";

  const { data, isLoading } = useQuery<{ deployments: Deployment[] }>({
    queryKey: ["deployments", projectKey, envFilter],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/deployments${queryParams}`).then(
        (r) => {
          if (!r.ok) throw new Error("fetch failed");
          return r.json();
        }
      ),
  });

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground truncate tracking-tight">
              {projectData?.project?.name ?? projectKey}
            </h1>
            <ProjectTabs projectKey={projectKey} />
          </div>
          <Button asChild>
            <Link href={`/projects/${projectKey}/deployments/new`}>
              배포 기록
            </Link>
          </Button>
        </div>

        {/* Env filter */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {ENV_FILTERS.map((env) => (
            <Button
              key={env}
              size="sm"
              variant={envFilter === env ? "default" : "outline"}
              onClick={() => setEnvFilter(env)}
              className="whitespace-nowrap"
            >
              {env === "ALL" ? "전체" : env}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !data?.deployments || data.deployments.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground text-sm">
              배포 이력이 없습니다.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.deployments.map((dep) => (
              <Card key={dep.id}>
                <CardContent className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-lg font-semibold text-foreground break-words font-mono">
                        {dep.version}
                      </span>
                      <EnvBadge env={dep.environment} />
                      <DeployStatusBadge status={dep.status} />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {new Date(dep.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  {dep.description && (
                    <p className="text-sm text-muted-foreground break-words">
                      {dep.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>배포자: {dep.deployedBy?.name ?? "-"}</span>
                    {dep.deployedAt && (
                      <span>
                        · 배포 시간:{" "}
                        {new Date(dep.deployedAt).toLocaleString("ko-KR")}
                      </span>
                    )}
                  </div>
                  {dep.changes && (
                    <details className="mt-2">
                      <summary className="text-xs text-primary cursor-pointer hover:underline">
                        변경사항 보기
                      </summary>
                      <pre className="mt-2 text-xs text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md font-mono">
                        {dep.changes}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
