"use client";

import { use, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
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
    <div className="bg-white p-3 rounded-lg border border-gray-200">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
          className="min-w-0 flex-1"
        >
          <span className="text-xs text-gray-500">
            {projectKey}-{issue.issueNumber}
          </span>
          <h3 className="text-sm font-medium text-gray-900 mt-0.5 line-clamp-2 break-words">
            {issue.title}
          </h3>
        </Link>
        <PriorityBadge priority={issue.priority} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <select
          value={issue.status}
          onChange={(e) =>
            onStatusChange(issue, e.target.value as IssueStatus)
          }
          className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-700"
          aria-label="상태 변경"
        >
          {COLUMNS.map((col) => (
            <option key={col.id} value={col.id}>
              {col.label}
            </option>
          ))}
        </select>
        {issue.assignee && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-medium flex-shrink-0">
              {issue.assignee.name.charAt(0)}
            </div>
            <span className="truncate">{issue.assignee.name}</span>
          </div>
        )}
      </div>
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
  const [activeColumn, setActiveColumn] = useState<IssueStatus>("TODO");

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
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {projectData?.project?.name ?? projectKey}
            </h1>
            <ProjectTabs projectKey={projectKey} />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            {/* Mobile: status pill selector + single column card list */}
            <div className="md:hidden space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setActiveColumn(col.id)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                      activeColumn === col.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {col.label} ({issuesByStatus[col.id].length})
                  </button>
                ))}
              </div>
              {issuesByStatus[activeColumn].length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
                  이 상태의 이슈가 없습니다.
                </div>
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
                    />
                  ))}
                </div>
                <DragOverlay>
                  {activeIssue && (
                    <div className="bg-white p-3 rounded-lg border-2 border-blue-400 shadow-lg w-[260px]">
                      <p className="text-sm font-medium">
                        {activeIssue.title}
                      </p>
                      <span className="text-xs text-gray-400">
                        {projectKey}-{activeIssue.issueNumber}
                      </span>
                    </div>
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
