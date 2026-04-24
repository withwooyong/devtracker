"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { ProjectTabs } from "@/components/layout/project-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import type { Project } from "@/types/project";

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const { user: authUser, isLoading: authLoading } = useAuthStore();

  const { data, isLoading } = useQuery<{ project: Project }>({
    queryKey: ["project", projectKey],
    queryFn: () =>
      fetch(`/api/projects/${projectKey}`).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const project = data?.project;
  const canEdit = Boolean(
    authUser &&
      project &&
      (authUser.role === "ADMIN" || project.createdById === authUser.id)
  );

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground truncate tracking-tight">
              {project?.name ?? projectKey}
            </h1>
            <ProjectTabs projectKey={projectKey} />
          </div>
        </div>

        {isLoading || authLoading ? (
          <Card>
            <CardContent className="space-y-5 py-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-24" />
            </CardContent>
          </Card>
        ) : !project ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              프로젝트를 찾을 수 없습니다.
            </CardContent>
          </Card>
        ) : !canEdit ? (
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
            <CardContent className="py-4 text-sm text-amber-900 dark:text-amber-200">
              이 프로젝트의 설정을 편집할 권한이 없습니다. 관리자 또는 프로젝트
              생성자만 편집할 수 있습니다.
            </CardContent>
          </Card>
        ) : (
          <SettingsForm
            key={project.id}
            project={project}
            projectKey={projectKey}
          />
        )}
      </div>
    </MainLayout>
  );
}

function SettingsForm({
  project,
  projectKey,
}: {
  project: Project;
  projectKey: string;
}) {
  const queryClient = useQueryClient();
  const [description, setDescription] = useState(project.description ?? "");
  const [githubRepo, setGithubRepo] = useState(project.githubRepo ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  // null = 변경 없음, "set" = 새 값 설정, "clear" = 제거
  const [webhookSecretAction, setWebhookSecretAction] = useState<
    null | "set" | "clear"
  >(null);

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/projects/${projectKey}`, {
        method: "PATCH",
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
        throw new Error(detail || payload?.error || "저장 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectKey] });
      toast.success("저장되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body: Record<string, unknown> = {
              description: description.trim(),
              githubRepo: githubRepo.trim(),
            };
            if (webhookSecretAction === "set") {
              body.githubWebhookSecret = webhookSecret;
            } else if (webhookSecretAction === "clear") {
              body.githubWebhookSecret = "";
            }
            updateMutation.mutate(body, {
              onSuccess: () => {
                setWebhookSecret("");
                setWebhookSecretAction(null);
              },
            });
          }}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <Label htmlFor="project-key">프로젝트 키</Label>
            <Input id="project-key" value={project.key} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              키는 변경할 수 없습니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-description">설명</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="프로젝트 설명을 입력하세요."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-github-repo">GitHub 레포지토리</Label>
            <Input
              id="project-github-repo"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repo"
            />
            <p className="text-xs text-muted-foreground">
              &quot;owner/repo&quot; 형식으로 입력합니다. 비워두면 해당
              프로젝트는 webhook 연동 대상에서 제외됩니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-webhook-secret">Webhook Secret</Label>
            <div className="flex items-center gap-2 mb-1 text-xs">
              <Badge
                variant={
                  project.githubWebhookSecretSet ? "emerald" : "slate"
                }
              >
                {project.githubWebhookSecretSet ? "설정됨" : "미설정"}
              </Badge>
              {project.githubWebhookSecretSet &&
                webhookSecretAction !== "set" && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setWebhookSecretAction("clear")}
                    className="h-auto p-0 focus-visible:ring-offset-2 text-destructive hover:text-destructive/80"
                  >
                    제거
                  </Button>
                )}
              {webhookSecretAction === "clear" && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    // 제거 모드 취소 시 input에 남아 있던 값도 비워야 이후 저장에서
                    // silent drop 되지 않는다 (input이 disabled인 동안 state가 갱신되지 않음).
                    setWebhookSecret("");
                    setWebhookSecretAction(null);
                  }}
                  className="h-auto p-0 focus-visible:ring-offset-2 text-muted-foreground hover:text-foreground"
                >
                  제거 취소
                </Button>
              )}
            </div>
            <Input
              id="project-webhook-secret"
              type="password"
              value={webhookSecret}
              onChange={(e) => {
                setWebhookSecret(e.target.value);
                setWebhookSecretAction(
                  e.target.value.length > 0 ? "set" : null
                );
              }}
              autoComplete="new-password"
              disabled={webhookSecretAction === "clear"}
              placeholder={
                project.githubWebhookSecretSet
                  ? "재설정하려면 새 secret 입력 (16자 이상)"
                  : "16자 이상의 새 secret 입력"
              }
            />
            <p className="text-xs text-muted-foreground">
              프로젝트별 secret이 설정되면 이 프로젝트의 webhook은 전역 secret
              대신 이 값으로 서명을 재검증합니다. 값은 저장 후 다시 표시되지
              않습니다.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button asChild variant="outline">
              <Link href={`/projects/${projectKey}`}>취소</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
