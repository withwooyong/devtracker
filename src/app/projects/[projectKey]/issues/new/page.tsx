"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { RichEditor } from "@/components/common/rich-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";
import type { Label as IssueLabel } from "@/types/issue";

// Radix Select는 빈 문자열 값을 허용하지 않아 "미지정"용 센티넬이 필요하다.
const UNASSIGNED = "__unassigned__";

export default function NewIssuePage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: () =>
      fetch("/api/users").then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const { data: labelsData } = useQuery<{ labels: IssueLabel[] }>({
    queryKey: ["labels", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/labels`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/projects/${projectKey}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("생성 실패");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("이슈가 생성되었습니다.");
      router.push(`/projects/${projectKey}`);
    },
  });

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">이슈 생성</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  title,
                  description: description || undefined,
                  status,
                  priority,
                  assigneeId: assigneeId || null,
                  labelIds: selectedLabels,
                  dueDate: dueDate || null,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="issue-title">제목 *</Label>
                <Input
                  id="issue-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>설명</Label>
                <RichEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="이슈 설명을 입력하세요..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>상태</Label>
                  <Select value={status} onValueChange={setStatus}>
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
                  <Label>우선순위</Label>
                  <Select value={priority} onValueChange={setPriority}>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>담당자</Label>
                  <Select
                    value={assigneeId || UNASSIGNED}
                    onValueChange={(v) =>
                      setAssigneeId(v === UNASSIGNED ? "" : v)
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
                <div className="space-y-1.5">
                  <Label htmlFor="issue-due">마감일</Label>
                  <Input
                    id="issue-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {labelsData?.labels && labelsData.labels.length > 0 && (
                <div className="space-y-1.5">
                  <Label>라벨</Label>
                  <div className="flex gap-2 flex-wrap">
                    {labelsData.labels.map((label) => {
                      const selected = selectedLabels.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => {
                            setSelectedLabels((prev) =>
                              prev.includes(label.id)
                                ? prev.filter((id) => id !== label.id)
                                : [...prev, label.id]
                            );
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs border transition-colors",
                            selected
                              ? "border-transparent text-white"
                              : "border-input text-muted-foreground hover:bg-accent"
                          )}
                          style={
                            selected ? { backgroundColor: label.color } : {}
                          }
                        >
                          {label.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "생성 중..." : "이슈 생성"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
