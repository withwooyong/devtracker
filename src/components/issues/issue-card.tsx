"use client";

import Link from "next/link";
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
      className="block bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
          {projectKey}-{issue.issueNumber}
        </span>
        <PriorityBadge priority={issue.priority} />
      </div>

      <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 break-words">
        {issue.title}
      </h3>

      {issue.labels && issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
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

      <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
        <StatusBadge status={issue.status} />
        <span className="truncate">{issue.assignee?.name ?? "-"}</span>
        <span className="whitespace-nowrap">
          {new Date(issue.createdAt).toLocaleDateString("ko-KR")}
        </span>
      </div>
    </Link>
  );
}
