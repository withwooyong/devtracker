export type NotificationType =
  | "ISSUE_ASSIGNED"
  | "ISSUE_STATUS_CHANGED"
  | "ISSUE_COMMENTED"
  | "SPRINT_STARTED"
  | "SPRINT_COMPLETED";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  ISSUE_ASSIGNED: "👤",
  ISSUE_STATUS_CHANGED: "🔄",
  ISSUE_COMMENTED: "💬",
  SPRINT_STARTED: "🏁",
  SPRINT_COMPLETED: "✅",
};
