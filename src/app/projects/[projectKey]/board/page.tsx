"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { PriorityBadge } from "@/components/common/status-badge";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Issue, IssueStatus } from "@/types/issue";

const COLUMNS: { id: IssueStatus; label: string; color: string }[] = [
  { id: "TODO", label: "할 일", color: "bg-gray-200" },
  { id: "IN_PROGRESS", label: "진행 중", color: "bg-blue-200" },
  { id: "IN_REVIEW", label: "리뷰 중", color: "bg-yellow-200" },
  { id: "DONE", label: "완료", color: "bg-green-200" },
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <Link
        href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
        className="text-sm font-medium text-gray-900 hover:text-blue-600 block mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {issue.title}
      </Link>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {projectKey}-{issue.issueNumber}
        </span>
        <PriorityBadge priority={issue.priority} />
      </div>
      {issue.assignee && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium">
            {issue.assignee.name.charAt(0)}
          </div>
          <span className="text-xs text-gray-500">{issue.assignee.name}</span>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  column,
  issues,
  projectKey,
}: {
  column: (typeof COLUMNS)[0];
  issues: Issue[];
  projectKey: string;
}) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: { type: "column" },
    disabled: true,
  });

  return (
    <div className="flex-1 min-w-[260px]">
      <div
        className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-t-lg ${column.color}`}
      >
        <h3 className="text-sm font-semibold text-gray-800">{column.label}</h3>
        <span className="text-xs text-gray-600 bg-white/50 px-1.5 py-0.5 rounded">
          {issues.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="space-y-2 min-h-[200px] bg-gray-50 p-2 rounded-b-lg"
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <KanbanCard key={issue.id} issue={issue} projectKey={projectKey} />
          ))}
        </SortableContext>
      </div>
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

  const { data: projectData } = useQuery<{
    project: { id: string; name: string };
  }>({
    queryKey: ["project", projectKey],
    queryFn: () => fetch(`/api/projects/${projectKey}`).then((r) => { if (!r.ok) throw new Error("fetch failed"); return r.json(); }),
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
    mutationFn: (
      items: { id: string; status: IssueStatus; kanbanOrder: number }[]
    ) =>
      fetch(`/api/projects/${projectKey}/board`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }),
    onSuccess: () => {
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

  function handleDragStart(event: DragStartEvent) {
    const issue = issues.find((i) => i.id === event.active.id);
    setActiveIssue(issue ?? null);
  }

  function handleDragOver() {
    // No-op — real reordering happens on drag end
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCol = findColumnByIssueId(activeId);
    const targetCol =
      COLUMNS.find((c) => c.id === overId)?.id ??
      findColumnByIssueId(overId);

    if (!sourceCol || !targetCol) return;

    const sourceItems = [...issuesByStatus[sourceCol]];
    const targetItems =
      sourceCol === targetCol ? sourceItems : [...issuesByStatus[targetCol]];

    const activeIdx = sourceItems.findIndex((i) => i.id === activeId);
    if (activeIdx === -1) return;

    const movedItem = { ...sourceItems[activeIdx], status: targetCol };
    sourceItems.splice(activeIdx, 1);

    if (sourceCol === targetCol) {
      const overIdx = sourceItems.findIndex((i) => i.id === overId);
      if (overIdx !== -1) {
        sourceItems.splice(overIdx, 0, movedItem);
      } else {
        sourceItems.push(movedItem);
      }
      const updates = sourceItems.map((item, idx) => ({
        id: item.id,
        status: targetCol,
        kanbanOrder: idx,
      }));
      boardMutation.mutate(updates);
    } else {
      const overIdx = targetItems.findIndex((i) => i.id === overId);
      if (overIdx !== -1) {
        targetItems.splice(overIdx, 0, movedItem);
      } else {
        targetItems.push(movedItem);
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
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {projectData?.project?.name ?? projectKey} - 칸반 보드
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
                className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1"
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
                className="text-gray-500 hover:text-gray-700 pb-1"
              >
                배포 이력
              </Link>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
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
                />
              ))}
            </div>
            <DragOverlay>
              {activeIssue && (
                <div className="bg-white p-3 rounded-lg border-2 border-blue-400 shadow-lg w-[260px]">
                  <p className="text-sm font-medium">{activeIssue.title}</p>
                  <span className="text-xs text-gray-400">
                    {projectKey}-{activeIssue.issueNumber}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </MainLayout>
  );
}
