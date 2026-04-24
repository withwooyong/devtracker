"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewDeploymentPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = use(params);
  const router = useRouter();

  const [version, setVersion] = useState("");
  const [environment, setEnvironment] = useState("DEV");
  const [description, setDescription] = useState("");
  const [changes, setChanges] = useState("");

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      fetch(`/api/projects/${projectKey}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("생성 실패");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("배포가 기록되었습니다.");
      router.push(`/projects/${projectKey}/deployments`);
    },
    onError: () => {
      toast.error("배포 기록에 실패했습니다.");
    },
  });

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6 tracking-tight">
          배포 기록
        </h1>

        <Card>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  version,
                  environment,
                  description: description || undefined,
                  changes: changes || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deploy-version">버전 *</Label>
                  <Input
                    id="deploy-version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v1.2.3"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deploy-env">환경 *</Label>
                  <Select value={environment} onValueChange={setEnvironment}>
                    <SelectTrigger id="deploy-env" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEV">DEV (개발)</SelectItem>
                      <SelectItem value="STAGING">STAGING (스테이징)</SelectItem>
                      <SelectItem value="PROD">PROD (운영)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deploy-desc">설명</Label>
                <Input
                  id="deploy-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="배포 요약"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deploy-changes">변경사항 (Markdown)</Label>
                <Textarea
                  id="deploy-changes"
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder={"- 기능 추가: ...\n- 버그 수정: ...\n- 개선: ..."}
                  className="h-40 font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                >
                  취소
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "기록 중..." : "배포 기록"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
