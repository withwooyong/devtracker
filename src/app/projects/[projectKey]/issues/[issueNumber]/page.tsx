"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { ActivityTimeline } from "@/components/common/activity-timeline";
import { AttachmentList } from "@/components/common/attachment-list";
import { GitHubLinkList } from "@/components/common/github-link-list";
import { RichEditor } from "@/components/common/rich-editor";
import { UserAvatar } from "@/components/common/user-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Issue } from "@/types/issue";
import type { User } from "@/types/user";
import type { Activity } from "@/types/activity";

type TabKey = "comments" | "activities" | "all";

const UNASSIGNED = "__unassigned__";

// Tiptap 빈 에디터는 "<p></p>"를 getHTML()로 반환한다. 태그를 걷어낸 텍스트가
// 비어 있으면 사용자가 실제로 입력한 게 없는 것으로 취급한다.
// &nbsp;(U+00A0)는 trim()이 제거하지 않으므로 공백으로 치환 후 판정한다.
function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length === 0
  );
}

export default function IssueDetailPage({
  params,
}: {
  params: Promise<{ projectKey: string; issueNumber: string }>;
}) {
  const { projectKey, issueNumber } = use(params);
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
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
    enabled:
      !!data?.issue?.id && (activeTab === "activities" || activeTab === "all"),
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
    // 저장 성공 토스트는 편집 다이얼로그의 "저장" 버튼에서 per-call onSuccess로 처리.
    // 인라인 드롭다운(상태/우선순위/담당자/라벨/기한) 변경은 조용히 처리하기 위해
    // mutation-level onSuccess에는 토스트를 두지 않는다.
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
    mutationFn: (vars: { content: string; parentId?: string }) =>
      fetch(
        `/api/projects/${projectKey}/issues/${data?.issue?.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(vars),
        }
      ).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["issue", projectKey, issueNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", projectKey, issueNumber],
      });
      if (vars.parentId) {
        setReplyContent("");
        setReplyingTo(null);
        toast.success("답글이 작성되었습니다.");
      } else {
        setComment("");
        toast.success("댓글이 작성되었습니다.");
      }
    },
  });

  const issue = data?.issue;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!issue) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              이슈를 찾을 수 없습니다.
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Build merged timeline for "전체" tab
  type TimelineItem =
    | {
        kind: "comment";
        createdAt: string;
        data: NonNullable<Issue["comments"]>[number];
      }
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
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/projects/${projectKey}`}
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block transition-colors"
        >
          &larr; 이슈 목록으로
        </Link>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-6 min-w-0">
            {isEditing ? (
              <Card>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-title">제목</Label>
                    <Input
                      id="edit-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-bold h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-desc">설명</Label>
                    <Textarea
                      id="edit-desc"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="h-40 font-mono"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate(
                          {
                            title: editTitle,
                            description: editDesc,
                          },
                          {
                            onSuccess: () =>
                              toast.success("저장되었습니다."),
                          }
                        )
                      }
                    >
                      저장
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-muted-foreground font-mono">
                        {projectKey}-{issue.issueNumber}
                      </span>
                      <h1 className="text-xl font-bold text-foreground mt-1 break-words tracking-tight">
                        {issue.title}
                      </h1>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditTitle(issue.title);
                        setEditDesc(issue.description ?? "");
                        setIsEditing(true);
                      }}
                    >
                      편집
                    </Button>
                  </div>
                  {issue.description && (
                    <div className="mt-4 text-sm break-words">
                      <RichEditor content={issue.description} editable={false} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <AttachmentList
              projectKey={projectKey}
              issueNumber={issue.issueNumber}
              issueId={issue.id}
            />

            <GitHubLinkList
              projectKey={projectKey}
              issueNumber={issue.issueNumber}
              issueId={issue.id}
            />

            {/* Tab switcher */}
            <div className="space-y-4">
              <div className="flex gap-1 border-b border-border overflow-x-auto">
                {(
                  [
                    {
                      key: "comments",
                      label: `댓글 (${issue.comments?.length ?? 0})`,
                    },
                    { key: "activities", label: "활동" },
                    { key: "all", label: "전체" },
                  ] as { key: TabKey; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer",
                      activeTab === key
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* 댓글 tab */}
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {(() => {
                    const all = issue.comments ?? [];
                    const roots = all.filter((c) => !c.parentId);
                    const repliesByParent = new Map<string, typeof all>();
                    for (const c of all) {
                      if (c.parentId) {
                        const arr = repliesByParent.get(c.parentId) ?? [];
                        arr.push(c);
                        repliesByParent.set(c.parentId, arr);
                      }
                    }
                    return roots.map((c) => {
                      const replies = repliesByParent.get(c.id) ?? [];
                      return (
                        <div key={c.id} className="space-y-2">
                          <Card>
                            <CardContent>
                              <div className="flex items-center gap-2 mb-2">
                                <UserAvatar
                                  name={c.author.name}
                                  avatarUrl={c.author.avatarUrl}
                                  size="sm"
                                />
                                <span className="text-sm font-medium text-foreground">
                                  {c.author.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleString(
                                    "ko-KR"
                                  )}
                                </span>
                              </div>
                              <div className="text-sm text-foreground break-words">
                                <RichEditor
                                  content={c.content}
                                  editable={false}
                                />
                              </div>
                              <div className="mt-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => {
                                    setReplyingTo(
                                      replyingTo === c.id ? null : c.id
                                    );
                                    // 다른 답글 폼 내용이 새로 여는 폼에 새어 들어오는 걸 막는다.
                                    setReplyContent("");
                                  }}
                                >
                                  {replyingTo === c.id ? "답글 취소" : "답글"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {replies.length > 0 && (
                            <div className="ml-10 space-y-2">
                              {replies.map((r) => (
                                <Card key={r.id} className="bg-muted/40 py-3">
                                  <CardContent className="px-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <UserAvatar
                                        name={r.author.name}
                                        avatarUrl={r.author.avatarUrl}
                                        size="xs"
                                      />
                                      <span className="text-sm font-medium text-foreground">
                                        {r.author.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(
                                          r.createdAt
                                        ).toLocaleString("ko-KR")}
                                      </span>
                                    </div>
                                    <div className="text-sm text-foreground break-words">
                                      <RichEditor
                                        content={r.content}
                                        editable={false}
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}

                          {replyingTo === c.id && (
                            <form
                              className="ml-10"
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!isHtmlEmpty(replyContent)) {
                                  commentMutation.mutate({
                                    content: replyContent,
                                    parentId: c.id,
                                  });
                                }
                              }}
                            >
                              <Card className="py-3">
                                <CardContent className="px-4">
                                  <RichEditor
                                    content={replyContent}
                                    onChange={setReplyContent}
                                    placeholder="답글을 입력하세요..."
                                  />
                                  <div className="flex justify-end gap-2 mt-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setReplyingTo(null);
                                        setReplyContent("");
                                      }}
                                    >
                                      취소
                                    </Button>
                                    <Button
                                      type="submit"
                                      size="sm"
                                      disabled={
                                        commentMutation.isPending ||
                                        isHtmlEmpty(replyContent)
                                      }
                                    >
                                      답글 작성
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </form>
                          )}
                        </div>
                      );
                    });
                  })()}

                  <Card>
                    <CardContent>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!isHtmlEmpty(comment)) {
                            commentMutation.mutate({ content: comment });
                          }
                        }}
                      >
                        <RichEditor
                          content={comment}
                          onChange={setComment}
                          placeholder="댓글을 입력하세요..."
                        />
                        <div className="flex justify-end mt-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={
                              commentMutation.isPending || isHtmlEmpty(comment)
                            }
                          >
                            댓글 작성
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 활동 tab */}
              {activeTab === "activities" && (
                <Card>
                  <CardContent>
                    <ActivityTimeline
                      activities={activitiesData?.activities ?? []}
                    />
                  </CardContent>
                </Card>
              )}

              {/* 전체 tab */}
              {activeTab === "all" && (
                <div className="space-y-3">
                  {allItems.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      내역이 없습니다.
                    </div>
                  )}
                  {allItems.map((item) => {
                    if (item.kind === "comment") {
                      const c = item.data;
                      return (
                        <Card key={`comment-${c.id}`}>
                          <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                              <UserAvatar
                                name={c.author.name}
                                avatarUrl={c.author.avatarUrl}
                                size="sm"
                              />
                              <span className="text-sm font-medium text-foreground">
                                {c.author.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {c.parentId ? "답글" : "댓글"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.createdAt).toLocaleString("ko-KR")}
                              </span>
                            </div>
                            <div className="text-sm text-foreground break-words">
                              <RichEditor
                                content={c.content}
                                editable={false}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    const a = item.data;
                    return (
                      <Card key={`activity-${a.id}`} className="py-3">
                        <CardContent className="px-4">
                          <ActivityTimeline activities={[a]} />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">상태</Label>
                  <Select
                    value={issue.status}
                    onValueChange={(v) =>
                      updateMutation.mutate({ status: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">할 일</SelectItem>
                      <SelectItem value="IN_PROGRESS">진행 중</SelectItem>
                      <SelectItem value="IN_REVIEW">리뷰 중</SelectItem>
                      <SelectItem value="DONE">완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    우선순위
                  </Label>
                  <Select
                    value={issue.priority}
                    onValueChange={(v) =>
                      updateMutation.mutate({ priority: v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">낮음</SelectItem>
                      <SelectItem value="MEDIUM">보통</SelectItem>
                      <SelectItem value="HIGH">높음</SelectItem>
                      <SelectItem value="CRITICAL">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    담당자
                  </Label>
                  <Select
                    value={issue.assigneeId ?? UNASSIGNED}
                    onValueChange={(v) =>
                      updateMutation.mutate({
                        assigneeId: v === UNASSIGNED ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>미지정</SelectItem>
                      {usersData?.users?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>보고자</span>
                    <span className="text-foreground">
                      {issue.reporter?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>생성일</span>
                    <span className="text-foreground">
                      {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>수정일</span>
                    <span className="text-foreground">
                      {new Date(issue.updatedAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  {issue.dueDate && (
                    <div className="flex justify-between">
                      <span>마감일</span>
                      <span className="text-foreground">
                        {new Date(issue.dueDate).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  )}
                </div>

                {issue.labels && issue.labels.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        라벨
                      </Label>
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
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
