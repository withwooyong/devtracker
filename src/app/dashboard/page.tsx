"use client";

import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Project } from "@/types/project";

export default function DashboardPage() {
  const { data, isLoading } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects"],
    queryFn: () =>
      fetch("/api/projects").then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6 tracking-tight">
          대시보드
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="gap-3 py-6">
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.projects?.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.key}`}
                className="group"
              >
                <Card className="h-full gap-3 py-6 transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        {project.key}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-mono">
                          {project.key}
                        </p>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>이슈 {project._count?.issues ?? 0}개</span>
                      <span>배포 {project._count?.deployments ?? 0}개</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && (!data?.projects || data.projects.length === 0) && (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">프로젝트가 없습니다.</p>
              <Button asChild variant="outline">
                <Link href="/projects">프로젝트 생성하기</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
