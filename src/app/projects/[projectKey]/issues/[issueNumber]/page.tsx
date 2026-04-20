"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ActivityTimeline } from "@/components/common/activity-timeline";
import { AttachmentList } from "@/components/common/attachment-list";
import Link from "next/link";
import type { Issue } from "@/types/issue";
import type { User } from "@/types/user";
import type { Activity } from "@/types/activity";

type TabKey = "comments" | "activities" | "all";

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ projectKey: string; issueNumber: string }>;
}) {
  const { projectKey, issueNumber } = use(params);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("comments");

  const { data, isLoading } = useQuery<{ issue: Issue }>({
    queryKey: ["issue", projectKey, issueNumber],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/issues/${issueNumber}`).then((r) => {
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

  const { data: activitiesData } = useQuery<{ activities: Activity[] }>({
    queryKey: ["activities", projectKey, issueNumber, data?.issue?.id],
    queryFn: () =>
      fetch(
        `/api/projects/${projectKey}/issues/${data!.issue.id}/activities`
      ).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    enabled: !!data?.issue?.id && (activeTab === "activities" || activeTab === "all"),
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/projects/${projectKey}/issues/${issueNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issue", projectKey, issueNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", projectKey, issueNumber],
      });
      setIsEditing(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      fetch(
        `/api/projects/${projectKey}/issues/${data?.issue?.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      ).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["issue", projectKey, issueNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", projectKey, issueNumber],
      });
      setComment("");
    },
  });

  const issue = data?.issue;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (!issue) {
    return (
      <MainLayout>
        <div className="text-center py-12 text-gray-500">
          이슈를 찾을 수 없습니다.
        </div>
      </MainLayout>
    );
  }

  // Build merged timeline for "전체" tab
  type TimelineItem =
    | { kind: "comment"; createdAt: string; data: NonNullable<Issue["comments"]>[number] }
    | { kind: "activity"; createdAt: string; data: Activity };

  const allItems: TimelineItem[] = [];
  if (activeTab === "all") {
    for (const c of issue.comments ?? []) {
      allItems.push({ kind: "comment", createdAt: c.createdAt, data: c });
    }
    for (const a of activitiesData?.activities ?? []) {
      allItems.push({ kind: "activity", createdAt: a.createdAt, data: a });
    }
    allItems.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/projects/${projectKey}`}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block"
        >
          &larr; 이슈 목록으로
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content */}
          <div className="col-span-2 space-y-6">
            {isEditing ? (
              <div className="bg-white p-4 rounded-lg border space-y-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg h-40 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 text-sm text-gray-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={() =>
                      updateMutation.mutate({
                        title: editTitle,
                        description: editDesc,
                      })
                    }
                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm text-gray-500">
                      {projectKey}-{issue.issueNumber}
                    </span>
                    <h1 className="text-xl font-bold text-gray-900 mt-1">
                      {issue.title}
                    </h1>
                  </div>
                  <button
                    onClick={() => {
                      setEditTitle(issue.title);
                      setEditDesc(issue.description ?? "");
                      setIsEditing(true);
                    }}
                    className="text-sm text-gray-500 hover:text-blue-600"
                  >
                    편집
                  </button>
                </div>
                {issue.description && (
                  <div className="mt-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {issue.description}
                  </div>
                )}
              </div>
            )}

            <AttachmentList
              projectKey={projectKey}
              issueNumber={issue.issueNumber}
              issueId={issue.id}
            />

            {/* Tab switcher */}
            <div className="space-y-4">
              <div className="flex gap-1 border-b border-gray-200">
                {(
                  [
                    { key: "comments", label: `댓글 (${issue.comments?.length ?? 0})` },
                    { key: "activities", label: "활동" },
                    { key: "all", label: "전체" },
                  ] as { key: TabKey; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 댓글 tab */}
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {issue.comments?.map((c) => (
                    <div key={c.id} className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                          {c.author.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium">{c.author.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.createdAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                  ))}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (comment.trim()) {
                        commentMutation.mutate(comment);
                      }
                    }}
                    className="bg-white p-4 rounded-lg border"
                  >
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors h-24"
                      placeholder="댓글을 입력하세요..."
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={commentMutation.isPending || !comment.trim()}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        댓글 작성
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 활동 tab */}
              {activeTab === "activities" && (
                <div className="bg-white p-4 rounded-lg border">
                  <ActivityTimeline activities={activitiesData?.activities ?? []} />
                </div>
              )}

              {/* 전체 tab */}
              {activeTab === "all" && (
                <div className="space-y-3">
                  {allItems.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">
                      내역이 없습니다.
                    </div>
                  )}
                  {allItems.map((item) => {
                    if (item.kind === "comment") {
                      const c = item.data;
                      return (
                        <div key={`comment-${c.id}`} className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-medium">
                              {c.author.name.charAt(0)}
                            </div>
                            <span className="text-sm font-medium">{c.author.name}</span>
                            <span className="text-xs text-gray-400">댓글</span>
                            <span className="text-xs text-gray-400">
                              {new Date(c.createdAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </div>
                      );
                    }

                    const a = item.data;
                    return (
                      <div key={`activity-${a.id}`} className="bg-white px-4 py-3 rounded-lg border">
                        <ActivityTimeline activities={[a]} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  상태
                </label>
                <select
                  value={issue.status}
                  onChange={(e) =>
                    updateMutation.mutate({ status: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="TODO">할 일</option>
                  <option value="IN_PROGRESS">진행 중</option>
                  <option value="IN_REVIEW">리뷰 중</option>
                  <option value="DONE">완료</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  우선순위
                </label>
                <select
                  value={issue.priority}
                  onChange={(e) =>
                    updateMutation.mutate({ priority: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="LOW">낮음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="HIGH">높음</option>
                  <option value="CRITICAL">긴급</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  담당자
                </label>
                <select
                  value={issue.assigneeId ?? ""}
                  onChange={(e) =>
                    updateMutation.mutate({
                      assigneeId: e.target.value || null,
                    })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="">미지정</option>
                  {usersData?.users?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t space-y-2 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>보고자</span>
                  <span className="text-gray-700">{issue.reporter?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>생성일</span>
                  <span className="text-gray-700">
                    {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>수정일</span>
                  <span className="text-gray-700">
                    {new Date(issue.updatedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                {issue.dueDate && (
                  <div className="flex justify-between">
                    <span>마감일</span>
                    <span className="text-gray-700">
                      {new Date(issue.dueDate).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                )}
              </div>

              {issue.labels && issue.labels.length > 0 && (
                <div className="pt-2 border-t">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">
                    라벨
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {issue.labels.map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex px-2 py-0.5 rounded text-xs"
                        style={{
                          backgroundColor: label.color + "20",
                          color: label.color,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
