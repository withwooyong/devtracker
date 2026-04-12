"use client";

import type { IssueStatus, IssuePriority } from "@/types/issue";
import type { DeployStatus, DeployEnvironment } from "@/types/deployment";

const statusColors: Record<IssueStatus, string> = {
  TODO: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

const statusLabels: Record<IssueStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  IN_REVIEW: "리뷰 중",
  DONE: "완료",
};

const priorityColors: Record<IssuePriority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-600",
  HIGH: "bg-orange-100 text-orange-600",
  CRITICAL: "bg-red-100 text-red-600",
};

const priorityLabels: Record<IssuePriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};

const deployStatusColors: Record<DeployStatus, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  ROLLED_BACK: "bg-yellow-100 text-yellow-700",
};

const deployStatusLabels: Record<DeployStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  SUCCESS: "성공",
  FAILED: "실패",
  ROLLED_BACK: "롤백",
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
      {statusLabels[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}

export function DeployStatusBadge({ status }: { status: DeployStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${deployStatusColors[status]}`}
    >
      {deployStatusLabels[status]}
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
