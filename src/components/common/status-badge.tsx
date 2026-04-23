"use client";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/types/issue";
import { DEPLOY_STATUS_LABELS } from "@/types/deployment";
import type { IssueStatus, IssuePriority } from "@/types/issue";
import type { DeployStatus, DeployEnvironment } from "@/types/deployment";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const statusVariant: Record<IssueStatus, BadgeVariant> = {
  TODO: "slate",
  IN_PROGRESS: "blue",
  IN_REVIEW: "amber",
  DONE: "emerald",
};

const priorityVariant: Record<IssuePriority, BadgeVariant> = {
  LOW: "slate",
  MEDIUM: "blue",
  HIGH: "orange",
  CRITICAL: "red",
};

const deployStatusVariant: Record<DeployStatus, BadgeVariant> = {
  PENDING: "slate",
  IN_PROGRESS: "blue",
  SUCCESS: "emerald",
  FAILED: "red",
  ROLLED_BACK: "amber",
};

const envVariant: Record<DeployEnvironment, BadgeVariant> = {
  DEV: "slate",
  STAGING: "purple",
  PROD: "red",
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return <Badge variant={statusVariant[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <Badge variant={priorityVariant[priority]}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function DeployStatusBadge({ status }: { status: DeployStatus }) {
  return (
    <Badge variant={deployStatusVariant[status]}>
      {DEPLOY_STATUS_LABELS[status]}
    </Badge>
  );
}

export function EnvBadge({ env }: { env: DeployEnvironment }) {
  return <Badge variant={envVariant[env]}>{env}</Badge>;
}
