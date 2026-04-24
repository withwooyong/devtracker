"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/common/status-badge";
import type { Issue } from "@/types/issue";

export function IssueCard({
  issue,
  projectKey,
}: {
  issue: Issue;
  projectKey: string;
}) {
  return (
    <Link
      href={`/projects/${projectKey}/issues/${issue.issueNumber}`}
      prefetch={false}
      className="block group"
    >
      <Card className="py-3 gap-2 transition-all hover:border-primary/40 hover:shadow-sm">
        <CardContent className="px-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Badge
              variant="outline"
              className="font-mono text-[10px] px-1.5 h-5 text-muted-foreground"
            >
              {projectKey}-{issue.issueNumber}
            </Badge>
            <PriorityBadge priority={issue.priority} />
          </div>

          <h3 className="text-sm font-medium text-foreground line-clamp-2 break-words group-hover:text-primary transition-colors">
            {issue.title}
          </h3>

          {issue.labels && issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex px-1.5 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: label.color + "20",
                    color: label.color,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <StatusBadge status={issue.status} />
            <span className="truncate">{issue.assignee?.name ?? "-"}</span>
            <span className="whitespace-nowrap">
              {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
