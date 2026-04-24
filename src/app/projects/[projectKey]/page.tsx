"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
import { IssueCard } from "@/components/issues/issue-card";
import Link from "next/link";
import { StatusBadge, PriorityBadge } from "@/components/common/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/stores/filter-store";
import { useAuthStore } from "@/stores/auth-store";
import type { Issue, IssueStatus, IssuePriority } from "@/types/issue";
import type { User } from "@/types/user";
import type { SavedFilter } from "@/types/filter";

export default function ProjectIssuePage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const {
    status,
    priority,
    assigneeId,
    search,
    setStatus,
    setPriority,
    setAssigneeId,
    setSearch,
  } = useFilterStore();
  const { user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [showSaveForm, setShowSaveForm] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilter =
    status !== "ALL" ||
    priority !== "ALL" ||
    assigneeId !== "ALL" ||
    search !== "";

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

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: () =>
      fetch("/api/users").then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const { data: savedFiltersData } = useQuery<{ filters: SavedFilter[] }>({
    queryKey: ["savedFilters", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/filters`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const queryParams = new URLSearchParams();
  if (status !== "ALL") queryParams.set("status", status);
  if (priority !== "ALL") queryParams.set("priority", priority);
  if (assigneeId !== "ALL") queryParams.set("assigneeId", assigneeId);
  if (search) queryParams.set("search", search);

  const { data, isLoading } = useQuery<{ issues: Issue[]; total: number }>({
    queryKey: ["issues", projectKey, status, priority, assigneeId, search],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/issues?${queryParams}`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const createFilterMutation = useMutation({
    mutationFn: (payload: {
      name: string;
      filters: string;
      isShared: boolean;
    }) =>
      fetch(`/api/projects/${projectKey}/filters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters", projectKey] });
      setShowSaveForm(false);
      setFilterName("");
      setIsShared(false);
      toast.success("필터를 저장했습니다.");
    },
    onError: () => {
      toast.error("필터 저장에 실패했습니다.");
    },
  });

  const deleteFilterMutation = useMutation({
    mutationFn: (filterId: string) =>
      fetch(`/api/projects/${projectKey}/filters/${filterId}`, {
        method: "DELETE",
      }).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFilters", projectKey] });
    },
    onError: () => {
      toast.error("필터 삭제에 실패했습니다.");
    },
  });

  function handleSaveFilter() {
    if (!filterName.trim()) return;
    const filtersJson = JSON.stringify({
      status: status !== "ALL" ? status : undefined,
      priority: priority !== "ALL" ? priority : undefined,
      assigneeId: assigneeId !== "ALL" ? assigneeId : undefined,
      search: search || undefined,
    });
    createFilterMutation.mutate({
      name: filterName.trim(),
      filters: filtersJson,
      isShared,
    });
  }

  function handleApplyFilter(f: SavedFilter) {
    let filters: {
      status?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
    };
    try {
      filters =
        typeof f.filters === "string" ? JSON.parse(f.filters) : f.filters;
    } catch {
      toast.error("저장된 필터 형식이 올바르지 않습니다.");
      return;
    }
    setStatus((filters.status as IssueStatus | undefined) ?? "ALL");
    setPriority((filters.priority as IssuePriority | undefined) ?? "ALL");
    setAssigneeId(filters.assigneeId ?? "ALL");
    setSearch(filters.search ?? "");
    setFiltersOpen(false);
  }

  const savedFilters = savedFiltersData?.filters ?? [];

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
            <Link href={`/projects/${projectKey}/issues/new`}>이슈 생성</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="py-3 mb-4">
          <CardContent className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 md:flex-wrap">
            {/* Saved filters popover */}
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto justify-between md:justify-start gap-1.5"
                >
                  저장된 필터
                  <ChevronDownIcon className="size-3.5 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="p-1 w-64">
                {savedFilters.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    저장된 필터가 없습니다.
                  </p>
                ) : (
                  savedFilters.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between px-2 py-1 rounded-sm hover:bg-accent group"
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyFilter(f)}
                        className="flex-1 text-left text-sm text-foreground truncate py-0.5"
                      >
                        {f.name}
                        {f.isShared && (
                          <span className="ml-1.5 text-xs text-primary">
                            (공유)
                          </span>
                        )}
                      </button>
                      {f.userId === authUser?.id && (
                        <button
                          type="button"
                          onClick={() => deleteFilterMutation.mutate(f.id)}
                          className="ml-2 text-muted-foreground/50 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                          aria-label="필터 삭제"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </PopoverContent>
            </Popover>

            <Input
              type="text"
              placeholder="검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-48 h-8"
            />

            <Select
              value={status}
              onValueChange={(v) => setStatus(v as IssueStatus | "ALL")}
            >
              <SelectTrigger
                size="sm"
                className="w-full md:w-auto min-w-[120px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">모든 상태</SelectItem>
                <SelectItem value="TODO">할 일</SelectItem>
                <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                <SelectItem value="IN_REVIEW">리뷰 중</SelectItem>
                <SelectItem value="DONE">완료</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as IssuePriority | "ALL")}
            >
              <SelectTrigger
                size="sm"
                className="w-full md:w-auto min-w-[140px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">모든 우선순위</SelectItem>
                <SelectItem value="CRITICAL">긴급</SelectItem>
                <SelectItem value="HIGH">높음</SelectItem>
                <SelectItem value="MEDIUM">보통</SelectItem>
                <SelectItem value="LOW">낮음</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger
                size="sm"
                className="w-full md:w-auto min-w-[140px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">모든 담당자</SelectItem>
                {usersData?.users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Save filter button — only when a filter is active */}
            {hasActiveFilter && !showSaveForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveForm(true)}
                className="w-full md:w-auto border-primary/40 text-primary hover:bg-primary/5"
              >
                필터 저장
              </Button>
            )}

            {/* Inline save form */}
            {showSaveForm && (
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:flex-wrap">
                <Input
                  type="text"
                  placeholder="필터 이름"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveFilter();
                  }}
                  className="w-full md:w-36 h-8"
                  autoFocus
                />
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="rounded border-input accent-primary"
                  />
                  공유
                </label>
                <Button
                  size="sm"
                  onClick={handleSaveFilter}
                  disabled={!filterName.trim() || createFilterMutation.isPending}
                >
                  저장
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSaveForm(false);
                    setFilterName("");
                    setIsShared(false);
                  }}
                >
                  취소
                </Button>
              </div>
            )}

            <span className="text-xs text-muted-foreground md:ml-auto">
              총 {data?.total ?? 0}개
            </span>
          </CardContent>
        </Card>

        {/* Issue list */}
        {isLoading ? (
          <>
            <div className="md:hidden space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="py-3">
                  <CardContent className="space-y-2 px-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="hidden md:block">
              <Card className="py-0">
                <div className="space-y-0 divide-y divide-border">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        ) : !data?.issues || data.issues.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground text-sm">
              이슈가 없습니다.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden space-y-2">
              {data.issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  projectKey={projectKey}
                />
              ))}
            </div>

            {/* Desktop table */}
            <Card className="hidden md:block py-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-16 uppercase text-xs">#</TableHead>
                    <TableHead className="uppercase text-xs">제목</TableHead>
                    <TableHead className="w-24 uppercase text-xs">상태</TableHead>
                    <TableHead className="w-24 uppercase text-xs">
                      우선순위
                    </TableHead>
                    <TableHead className="w-28 uppercase text-xs">
                      담당자
                    </TableHead>
                    <TableHead className="w-28 uppercase text-xs">
                      생성일
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.issues.map((issue) => (
                    <TableRow key={issue.id} className="group">
                      <TableCell className="text-sm text-muted-foreground font-mono">
                        {projectKey}-{issue.issueNumber}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <Link
                          href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
                          className="text-sm font-medium text-foreground group-hover:text-primary transition-colors"
                        >
                          {issue.title}
                        </Link>
                        {issue.labels && issue.labels.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {issue.labels.map((label) => (
                              <span
                                key={label.id}
                                className={cn(
                                  "inline-flex px-1.5 py-0.5 rounded text-xs"
                                )}
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
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={issue.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={issue.priority} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.assignee?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
