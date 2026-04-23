"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
import { PriorityBadge } from "@/components/common/status-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTilt } from "@/components/board/use-tilt";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import type { Issue, IssueStatus } from "@/types/issue";

type ColumnDef = {
  id: IssueStatus;
  label: string;
  base: string; // CSS 변수명
  glow: string;
  dot: string; // tailwind bg-*
};

const COLUMNS: ColumnDef[] = [
  {
    id: "TODO",
    label: "할 일",
    base: "var(--kanban-todo)",
    glow: "var(--kanban-todo-glow)",
    dot: "bg-slate-400",
  },
  {
    id: "IN_PROGRESS",
    label: "진행 중",
    base: "var(--kanban-progress)",
    glow: "var(--kanban-progress-glow)",
    dot: "bg-blue-500",
  },
  {
    id: "IN_REVIEW",
    label: "리뷰 중",
    base: "var(--kanban-review)",
    glow: "var(--kanban-review-glow)",
    dot: "bg-amber-500",
  },
  {
    id: "DONE",
    label: "완료",
    base: "var(--kanban-done)",
    glow: "var(--kanban-done-glow)",
    dot: "bg-emerald-500",
  },
];

function KanbanCard({
  issue,
  projectKey,
}: {
  issue: Issue;
  projectKey: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, data: { issue } });

  const tilt = useTilt({ max: 5, magnet: 3, active: !isDragging });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        ref={tilt.ref}
        onPointerMove={tilt.onPointerMove}
        onPointerLeave={tilt.onPointerLeave}
        onPointerDown={tilt.onPointerDown}
        className={cn(
          "tilt-card relative rounded-xl",
          "cursor-grab active:cursor-grabbing"
        )}
      >
        <Card
          className={cn(
            "gap-2 py-3 bg-card/95 backdrop-blur-sm",
            "shadow-sm hover:shadow-lg hover:shadow-black/5",
            "transition-shadow border-border/60"
          )}
        >
          <div className="px-3 flex flex-col gap-2">
            <Link
              href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
              prefetch={false}
              className="text-sm font-medium text-foreground hover:text-primary block leading-snug"
              onClick={(e) => e.stopPropagation()}
            >
              {issue.title}
            </Link>
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="font-mono text-[10px] px-1.5 py-0 h-5 text-muted-foreground"
              >
                {projectKey}-{issue.issueNumber}
              </Badge>
              <PriorityBadge priority={issue.priority} />
            </div>
            {issue.assignee && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                    {issue.assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  {issue.assignee.name}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MobileKanbanCard({
  issue,
  projectKey,
  onStatusChange,
}: {
  issue: Issue;
  projectKey: string;
  onStatusChange: (issue: Issue, status: IssueStatus) => void;
}) {
  return (
    <Card className="gap-2 py-3">
      <div className="px-3 flex items-start justify-between gap-2">
        <Link
          href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
          prefetch={false}
          className="min-w-0 flex-1"
        >
          <span className="text-xs text-muted-foreground font-mono">
            {projectKey}-{issue.issueNumber}
          </span>
          <h3 className="text-sm font-medium text-foreground mt-0.5 line-clamp-2 break-words">
            {issue.title}
          </h3>
        </Link>
        <PriorityBadge priority={issue.priority} />
      </div>
      <div className="px-3 flex items-center justify-between gap-2">
        <Select
          value={issue.status}
          onValueChange={(v) => onStatusChange(issue, v as IssueStatus)}
        >
          <SelectTrigger size="sm" className="text-sm" aria-label="상태 변경">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNS.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                <span
                  className={cn("size-2 rounded-full inline-block", col.dot)}
                />
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {issue.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <Avatar className="size-5">
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                {issue.assignee.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{issue.assignee.name}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

function KanbanColumn({
  column,
  issues,
  projectKey,
  isDragOver,
}: {
  column: ColumnDef;
  issues: Issue[];
  projectKey: string;
  isDragOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  return (
    <div className="flex-1 min-w-[272px]">
      <div
        ref={setNodeRef}
        data-dragover={isDragOver || undefined}
        className={cn(
          "ambient-column rounded-xl p-3 min-h-[320px]",
          "flex flex-col gap-3"
        )}
        style={
          {
            "--column-base": column.base,
            "--column-glow": column.glow,
          } as React.CSSProperties
        }
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2.5 rounded-full ring-2 ring-background/80",
                column.dot
              )}
            />
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {column.label}
            </h3>
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[11px] bg-background/70 backdrop-blur-sm"
            >
              {issues.length}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <SortableContext
            items={issues.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {issues.map((issue) => (
              <KanbanCard key={issue.id} issue={issue} projectKey={projectKey} />
            ))}
          </SortableContext>
          {issues.length === 0 && (
            <div className="flex items-center justify-center h-24 text-xs text-muted-foreground/70 italic border border-dashed border-border/60 rounded-lg">
              비어 있음
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          className="flex-1 min-w-[272px] ambient-column rounded-xl p-3 min-h-[320px]"
          style={
            {
              "--column-base": col.base,
              "--column-glow": col.glow,
            } as React.CSSProperties
          }
        >
          <div className="flex items-center gap-2 px-1 mb-3">
            <span className={cn("size-2.5 rounded-full", col.dot)} />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-7 rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="gap-2 py-3 bg-card/90">
                <div className="px-3 flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-5 w-10" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const queryClient = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [activeColumn, setActiveColumn] = useState<IssueStatus>("TODO");
  const [overColumn, setOverColumn] = useState<IssueStatus | null>(null);

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

  const { data, isLoading } = useQuery<{ issues: Issue[] }>({
    queryKey: ["issues", projectKey, "board"],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/issues?limit=100`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const boardMutation = useMutation({
    mutationFn: async (
      items: { id: string; status: IssueStatus; kanbanOrder: number }[]
    ) => {
      const res = await fetch(`/api/projects/${projectKey}/board`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        throw new Error(`PATCH /board 실패 (${res.status})`);
      }
      return res.json();
    },
    onMutate: async (items) => {
      const queryKey = ["issues", projectKey, "board"];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ issues: Issue[] }>(queryKey);
      if (previous) {
        const updateMap = new Map(items.map((u) => [u.id, u]));
        queryClient.setQueryData<{ issues: Issue[] }>(queryKey, {
          ...previous,
          issues: previous.issues.map((issue) => {
            const u = updateMap.get(issue.id);
            return u
              ? { ...issue, status: u.status, kanbanOrder: u.kanbanOrder }
              : issue;
          }),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["issues", projectKey, "board"],
          ctx.previous
        );
      }
      toast.error("칸반 순서 저장에 실패했습니다. 다시 시도해 주세요.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["issues", projectKey, "board"],
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const issues = data?.issues ?? [];

  const issuesByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = issues
        .filter((i) => i.status === col.id)
        .sort((a, b) => a.kanbanOrder - b.kanbanOrder);
      return acc;
    },
    {} as Record<IssueStatus, Issue[]>
  );

  const findColumnByIssueId = useCallback(
    (id: string): IssueStatus | null => {
      for (const [status, items] of Object.entries(issuesByStatus)) {
        if (items.some((i) => i.id === id)) return status as IssueStatus;
      }
      return null;
    },
    [issuesByStatus]
  );

  function handleMobileStatusChange(issue: Issue, newStatus: IssueStatus) {
    if (issue.status === newStatus) return;
    const sourceItems = issuesByStatus[issue.status].filter(
      (i) => i.id !== issue.id
    );
    const targetItems = [
      ...issuesByStatus[newStatus],
      { ...issue, status: newStatus },
    ];
    const updates = [
      ...sourceItems.map((item, idx) => ({
        id: item.id,
        status: issue.status,
        kanbanOrder: idx,
      })),
      ...targetItems.map((item, idx) => ({
        id: item.id,
        status: newStatus,
        kanbanOrder: idx,
      })),
    ];
    boardMutation.mutate(updates);
  }

  function handleDragStart(event: DragStartEvent) {
    const issue = issues.find((i) => i.id === event.active.id);
    setActiveIssue(issue ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const overId = event.over?.id;
    if (!overId) {
      setOverColumn(null);
      return;
    }
    const asCol = COLUMNS.find((c) => c.id === overId)?.id ?? null;
    if (asCol) {
      setOverColumn(asCol);
      return;
    }
    setOverColumn(findColumnByIssueId(overId as string));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    setOverColumn(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const sourceCol = findColumnByIssueId(activeId);
    const targetCol =
      COLUMNS.find((c) => c.id === overId)?.id ??
      findColumnByIssueId(overId);

    if (!sourceCol || !targetCol) return;

    if (sourceCol === targetCol) {
      const items = issuesByStatus[sourceCol];
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      const updates = reordered.map((item, idx) => ({
        id: item.id,
        status: sourceCol,
        kanbanOrder: idx,
      }));
      boardMutation.mutate(updates);
      return;
    }

    const sourceItems = issuesByStatus[sourceCol].filter(
      (i) => i.id !== activeId
    );
    const activeIssueData = issuesByStatus[sourceCol].find(
      (i) => i.id === activeId
    );
    if (!activeIssueData) return;
    const movedItem = { ...activeIssueData, status: targetCol };

    const targetItems = [...issuesByStatus[targetCol]];
    const overIdx = targetItems.findIndex((i) => i.id === overId);
    if (overIdx === -1) {
      targetItems.push(movedItem);
    } else {
      targetItems.splice(overIdx, 0, movedItem);
    }

    const updates = [
      ...sourceItems.map((item, idx) => ({
        id: item.id,
        status: sourceCol,
        kanbanOrder: idx,
      })),
      ...targetItems.map((item, idx) => ({
        id: item.id,
        status: targetCol,
        kanbanOrder: idx,
      })),
    ];
    boardMutation.mutate(updates);
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground truncate tracking-tight">
              {projectData?.project?.name ?? projectKey}
            </h1>
            <ProjectTabs projectKey={projectKey} />
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="hidden md:block">
              <BoardSkeleton />
            </div>
            <div className="md:hidden space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="gap-2 py-3">
                  <div className="px-3 flex flex-col gap-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Mobile: status pill selector + single column card list */}
            <div className="md:hidden space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {COLUMNS.map((col) => (
                  <Button
                    key={col.id}
                    type="button"
                    size="sm"
                    variant={activeColumn === col.id ? "default" : "outline"}
                    onClick={() => setActiveColumn(col.id)}
                    className="rounded-full whitespace-nowrap"
                  >
                    <span
                      className={cn("size-1.5 rounded-full mr-0.5", col.dot)}
                    />
                    {col.label} ({issuesByStatus[col.id].length})
                  </Button>
                ))}
              </div>
              {issuesByStatus[activeColumn].length === 0 ? (
                <Card className="py-8">
                  <p className="text-center text-muted-foreground text-sm px-6">
                    이 상태의 이슈가 없습니다.
                  </p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {issuesByStatus[activeColumn].map((issue) => (
                    <MobileKanbanCard
                      key={issue.id}
                      issue={issue}
                      projectKey={projectKey}
                      onStatusChange={handleMobileStatusChange}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: DnD kanban */}
            <div className="hidden md:block">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {COLUMNS.map((col) => (
                    <KanbanColumn
                      key={col.id}
                      column={col}
                      issues={issuesByStatus[col.id]}
                      projectKey={projectKey}
                      isDragOver={overColumn === col.id}
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeIssue && (
                    <Card className="w-[260px] gap-2 py-3 shadow-2xl shadow-black/20 border-primary/40 rotate-[1.5deg]">
                      <div className="px-3 flex flex-col gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {activeIssue.title}
                        </p>
                        <span className="text-xs text-muted-foreground font-mono">
                          {projectKey}-{activeIssue.issueNumber}
                        </span>
                      </div>
                    </Card>
                  )}
                </DragOverlay>
              </DndContext>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
