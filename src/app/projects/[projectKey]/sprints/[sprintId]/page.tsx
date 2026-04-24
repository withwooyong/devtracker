"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { BurndownChart } from "@/components/common/burndown-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type Sprint,
  type SprintStatus,
  SPRINT_STATUS_LABELS,
} from "@/types/sprint";
import type { Issue } from "@/types/issue";
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
      fetch(
        `/api/projects/${projectKey}/issues?sprintId=none&limit=200`
      ).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
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
      queryClient.invalidateQueries({
        queryKey: ["sprint", projectKey, sprintId],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["sprint", projectKey, sprintId],
      });
      queryClient.invalidateQueries({
        queryKey: ["backlog-issues", projectKey],
      });
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link
            href={`/projects/${projectKey}/sprints`}
            className="hover:text-foreground transition-colors"
          >
            ← 스프린트 목록
          </Link>
        </div>

        {isLoading || !sprint ? (
          <Card>
            <CardContent className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mb-4">
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-bold text-foreground truncate min-w-0 flex-1 md:flex-initial tracking-tight">
                        {sprint.name}
                      </h1>
                      <Badge
                        variant={SPRINT_STATUS_VARIANT[sprint.status]}
                        className="rounded-full"
                      >
                        {SPRINT_STATUS_LABELS[sprint.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      {projectData?.project?.name ?? projectKey} ·{" "}
                      {formatDate(sprint.startDate)} ~{" "}
                      {formatDate(sprint.endDate)}
                    </p>
                    {sprint.goal && (
                      <p className="text-sm text-foreground mt-3 whitespace-pre-wrap break-words">
                        {sprint.goal}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap md:flex-nowrap md:shrink-0">
                    {sprint.status === "PLANNED" && (
                      <Button
                        size="sm"
                        onClick={() => updateSprint.mutate({ status: "ACTIVE" })}
                      >
                        스프린트 시작
                      </Button>
                    )}
                    {sprint.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() =>
                          updateSprint.mutate({ status: "COMPLETED" })
                        }
                      >
                        스프린트 완료
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (
                          confirm(
                            "스프린트를 삭제하시겠습니까? 포함된 이슈는 백로그로 이동됩니다."
                          )
                        ) {
                          deleteSprint.mutate();
                        }
                      }}
                      className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    >
                      삭제
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>진행률</span>
                    <span>
                      {issues.filter((i) => i.status === "DONE").length} /{" "}
                      {issues.length} 완료 ({progress}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <p
                role="alert"
                className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2 mb-3"
              >
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

            <Card className="py-0">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-sm font-semibold text-foreground">
                  포함된 이슈{" "}
                  <span className="text-muted-foreground font-normal">
                    ({issues.length})
                  </span>
                </h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAdd((v) => !v)}
                >
                  {showAdd ? "닫기" : "이슈 추가"}
                </Button>
              </div>

              {showAdd && (
                <>
                  <Separator />
                  <div className="p-4 bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-2">
                      아직 스프린트에 속하지 않은 이슈
                    </p>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {backlogIssues.length === 0 ? (
                        <p className="text-xs text-muted-foreground/70 py-2">
                          추가할 백로그 이슈가 없습니다.
                        </p>
                      ) : (
                        backlogIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="flex items-center gap-2 bg-background border border-border rounded-md px-2 py-1.5"
                          >
                            <span className="text-xs text-muted-foreground shrink-0 w-12 font-mono">
                              #{issue.issueNumber}
                            </span>
                            <span className="min-w-0 flex-1 text-sm text-foreground truncate">
                              {issue.title}
                            </span>
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                assignIssue.mutate({
                                  issueId: issue.id,
                                  sprintValue: sprint.id,
                                })
                              }
                            >
                              추가
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              {issues.length === 0 ? (
                <>
                  <Separator />
                  <p className="p-6 text-sm text-muted-foreground text-center">
                    이 스프린트에 할당된 이슈가 없습니다.
                  </p>
                </>
              ) : (
                <>
                  <Separator />
                  <ul className="divide-y divide-border">
                    {issues.map((issue) => (
                      <li
                        key={issue.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Link
                            href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
                            className="text-xs text-muted-foreground shrink-0 hover:text-primary font-mono transition-colors"
                          >
                            #{issue.issueNumber}
                          </Link>
                          <Link
                            href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
                            className="min-w-0 flex-1 text-sm text-foreground truncate hover:text-primary transition-colors"
                          >
                            {issue.title}
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <StatusBadge status={issue.status} />
                          <PriorityBadge priority={issue.priority} />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              assignIssue.mutate({
                                issueId: issue.id,
                                sprintValue: null,
                              })
                            }
                            title="스프린트에서 제거"
                          >
                            제거
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
