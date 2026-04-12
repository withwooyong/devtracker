import type { User } from "./user";

export type DeployEnvironment = "DEV" | "STAGING" | "PROD";
export type DeployStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCESS"
  | "FAILED"
  | "ROLLED_BACK";

export interface Deployment {
  id: string;
  projectId: string;
  version: string;
  environment: DeployEnvironment;
  status: DeployStatus;
  description?: string | null;
  changes?: string | null;
  deployedById: string;
  deployedAt?: string | null;
  createdAt: string;
  deployedBy?: User;
}

export const ENV_LABELS: Record<DeployEnvironment, string> = {
  DEV: "개발",
  STAGING: "스테이징",
  PROD: "운영",
};

export const DEPLOY_STATUS_LABELS: Record<DeployStatus, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행 중",
  SUCCESS: "성공",
  FAILED: "실패",
  ROLLED_BACK: "롤백",
};
