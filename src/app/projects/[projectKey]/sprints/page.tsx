"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Sprint,
  SPRINT_STATUS_LABELS,
  type SprintStatus,
} from "@/types/sprint";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const SPRINT_STATUS_VARIANT: Record<SprintStatus, BadgeVariant> = {
  PLANNED: "slate",
  ACTIVE: "blue",
  COMPLETED: "emerald",
};

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
            <h1 className="text-2xl font-bold text-foreground truncate tracking-tight">
              {projectData?.project?.name ?? projectKey}
            </h1>
            <ProjectTabs projectKey={projectKey} />
          </div>
          <Button asChild>
            <Link href={`/projects/${projectKey}/sprints/new`}>
              스프린트 생성
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-48" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sprints.length === 0 ? (
          <Card className="py-10">
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                아직 스프린트가 없습니다. 첫 스프린트를 생성해 보세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ status, items }) =>
              items.length === 0 ? null : (
                <section key={status}>
                  <h2 className="text-sm font-semibold text-foreground mb-3">
                    {SPRINT_STATUS_LABELS[status]}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({items.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((sprint) => (
                      <Link
                        key={sprint.id}
                        href={`/projects/${projectKey}/sprints/${sprint.id}`}
                        className="block group"
                      >
                        <Card className="py-4 transition-all hover:border-primary/40 hover:shadow-sm">
                          <CardContent className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-foreground truncate min-w-0 flex-1 group-hover:text-primary transition-colors">
                                {sprint.name}
                              </h3>
                              <Badge
                                variant={SPRINT_STATUS_VARIANT[sprint.status]}
                                className="rounded-full"
                              >
                                {SPRINT_STATUS_LABELS[sprint.status]}
                              </Badge>
                            </div>
                            {sprint.goal && (
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                {sprint.goal}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="whitespace-nowrap">
                                {formatDate(sprint.startDate)} ~{" "}
                                {formatDate(sprint.endDate)}
                              </span>
                              <span className="whitespace-nowrap">
                                이슈 {sprint._count?.issues ?? 0}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
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
