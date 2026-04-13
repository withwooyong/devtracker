"use client";

import type { Activity, ActivityAction } from "@/types/activity";
import { ACTION_LABELS } from "@/types/activity";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/types/issue";
import type { IssueStatus, IssuePriority } from "@/types/issue";

function ValueBadge({ value, type }: { value: string; type: "status" | "priority" | "default" }) {
  if (type === "status") {
    const label = STATUS_LABELS[value as IssueStatus] ?? value;
    const colors: Record<string, string> = {
      TODO: "bg-gray-100 text-gray-700",
      IN_PROGRESS: "bg-blue-100 text-blue-700",
      IN_REVIEW: "bg-yellow-100 text-yellow-700",
      DONE: "bg-green-100 text-green-700",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-700"}`}>
        {label}
      </span>
    );
  }

  if (type === "priority") {
    const label = PRIORITY_LABELS[value as IssuePriority] ?? value;
    const colors: Record<string, string> = {
      LOW: "bg-gray-100 text-gray-600",
      MEDIUM: "bg-blue-100 text-blue-600",
      HIGH: "bg-orange-100 text-orange-600",
      CRITICAL: "bg-red-100 text-red-600",
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[value] ?? "bg-gray-100 text-gray-600"}`}>
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
      {value}
    </span>
  );
}

function ActivityDetail({ action, oldValue, newValue }: { action: ActivityAction; oldValue?: string | null; newValue?: string | null }) {
  if (action === "STATUS_CHANGED" && (oldValue || newValue)) {
    return (
      <span className="inline-flex items-center gap-1.5 ml-1">
        {oldValue && <ValueBadge value={oldValue} type="status" />}
        <span className="text-gray-400 text-xs">→</span>
        {newValue && <ValueBadge value={newValue} type="status" />}
      </span>
    );
  }

  if (action === "PRIORITY_CHANGED" && (oldValue || newValue)) {
    return (
      <span className="inline-flex items-center gap-1.5 ml-1">
        {oldValue && <ValueBadge value={oldValue} type="priority" />}
        <span className="text-gray-400 text-xs">→</span>
        {newValue && <ValueBadge value={newValue} type="priority" />}
      </span>
    );
  }

  return null;
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        활동 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          {/* Timeline connector */}
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs text-white font-medium flex-shrink-0 mt-0.5">
              {activity.user.name.charAt(0)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-px flex-1 bg-gray-200 my-1" />
            )}
          </div>

          {/* Content */}
          <div className={`pb-4 ${index < activities.length - 1 ? "" : ""}`}>
            <div className="flex flex-wrap items-center gap-1 text-sm">
              <span className="font-medium text-gray-800">{activity.user.name}</span>
              <span className="text-gray-500">{ACTION_LABELS[activity.action]}</span>
              <ActivityDetail
                action={activity.action}
                oldValue={activity.oldValue}
                newValue={activity.newValue}
              />
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {new Date(activity.createdAt).toLocaleString("ko-KR")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
