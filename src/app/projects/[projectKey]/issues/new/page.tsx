"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import type { User } from "@/types/user";
import type { Label } from "@/types/issue";

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
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  const { data: labelsData } = useQuery<{ labels: Label[] }>({
    queryKey: ["labels", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}/labels`).then((r) => r.json()),
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
      router.push(`/projects/${projectKey}`);
    },
  });

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">이슈 생성</h1>

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
          className="bg-white p-6 rounded-lg border border-gray-200 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 (Markdown)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors h-40 font-mono"
              placeholder="이슈에 대한 상세 설명을 작성해주세요..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="TODO">할 일</option>
                <option value="IN_PROGRESS">진행 중</option>
                <option value="IN_REVIEW">리뷰 중</option>
                <option value="DONE">완료</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                우선순위
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="LOW">낮음</option>
                <option value="MEDIUM">보통</option>
                <option value="HIGH">높음</option>
                <option value="CRITICAL">긴급</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                담당자
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              >
                <option value="">미지정</option>
                {usersData?.users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                마감일
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>
          </div>

          {labelsData?.labels && labelsData.labels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                라벨
              </label>
              <div className="flex gap-2 flex-wrap">
                {labelsData.labels.map((label) => (
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
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      selectedLabels.includes(label.id)
                        ? "border-transparent text-white"
                        : "border-gray-300 text-gray-600"
                    }`}
                    style={
                      selectedLabels.includes(label.id)
                        ? { backgroundColor: label.color }
                        : {}
                    }
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "생성 중..." : "이슈 생성"}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
