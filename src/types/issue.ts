import type { User } from "./user";

export type IssueStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
}

export interface Issue {
  id: string;
  projectId: string;
  issueNumber: number;
  title: string;
  description?: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId?: string | null;
  reporterId: string;
  kanbanOrder: number;
  dueDate?: string | null;
  sprintId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: User | null;
  reporter?: User;
  labels?: Label[];
  comments?: Comment[];
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  IN_REVIEW: "리뷰 중",
  DONE: "완료",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
  CRITICAL: "긴급",
};
