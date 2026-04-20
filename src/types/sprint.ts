import type { User } from "./user";
import type { Issue } from "./issue";

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  createdById: string;
  createdAt: string;
  createdBy?: Pick<User, "id" | "name"> | null;
  issues?: Issue[];
  _count?: { issues: number };
}

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  PLANNED: "예정",
  ACTIVE: "진행 중",
  COMPLETED: "완료",
};

export const SPRINT_STATUS_COLORS: Record<SprintStatus, string> = {
  PLANNED: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};
