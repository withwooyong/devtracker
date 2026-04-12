"use client";

import { STATUS_LABELS, PRIORITY_LABELS } from "@/types/issue";
import { DEPLOY_STATUS_LABELS } from "@/types/deployment";
import type { IssueStatus, IssuePriority } from "@/types/issue";
import type { DeployStatus, DeployEnvironment } from "@/types/deployment";

const statusColors: Record<IssueStatus, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

const priorityColors: Record<IssuePriority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  CRITICAL: "bg-red-100 text-red-600",
};

const deployStatusColors: Record<DeployStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  ROLLED_BACK: "bg-yellow-100 text-yellow-700",
};

const envColors: Record<DeployEnvironment, string> = {
  DEV: "bg-gray-100 text-gray-700",
  STAGING: "bg-purple-100 text-purple-700",
  PROD: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority]}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function DeployStatusBadge({ status }: { status: DeployStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${deployStatusColors[status]}`}
    >
      {DEPLOY_STATUS_LABELS[status]}
    </span>
  );
}

export function EnvBadge({ env }: { env: DeployEnvironment }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${envColors[env]}`}
    >
      {env}
    </span>
  );
}
