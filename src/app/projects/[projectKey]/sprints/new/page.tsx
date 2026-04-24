"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewSprintPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectKey}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const detail = Array.isArray(payload?.details)
          ? payload.details
              .map((d: { message?: string }) => d.message)
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(detail || payload?.error || "생성 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectKey] });
      router.push(`/projects/${projectKey}/sprints`);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link
            href={`/projects/${projectKey}/sprints`}
            className="hover:text-foreground transition-colors"
          >
            ← 스프린트 목록
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-6 tracking-tight">
          스프린트 생성
        </h1>

        <Card>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (!name.trim() || !startDate || !endDate) return;
                createMutation.mutate({
                  name: name.trim(),
                  goal: goal.trim() || null,
                  startDate,
                  endDate,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="sprint-name">이름 *</Label>
                <Input
                  id="sprint-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 2026-W17 스프린트"
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sprint-goal">목표</Label>
                <Textarea
                  id="sprint-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="스프린트에서 달성할 주요 목표"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sprint-start">시작일 *</Label>
                  <Input
                    id="sprint-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sprint-end">종료일 *</Label>
                  <Input
                    id="sprint-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
                >
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "생성 중…" : "생성"}
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/projects/${projectKey}/sprints`}>취소</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
