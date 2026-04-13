export type ActivityAction =
  | "CREATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "LABEL_ADDED"
  | "LABEL_REMOVED"
  | "COMMENT_ADDED";

export interface Activity {
  id: string;
  issueId: string;
  userId: string;
  action: ActivityAction;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; avatarUrl?: string | null };
}

export const ACTION_LABELS: Record<ActivityAction, string> = {
  CREATED: "이슈를 생성했습니다",
  STATUS_CHANGED: "상태를 변경했습니다",
  PRIORITY_CHANGED: "우선순위를 변경했습니다",
  ASSIGNEE_CHANGED: "담당자를 변경했습니다",
  LABEL_ADDED: "라벨을 추가했습니다",
  LABEL_REMOVED: "라벨을 제거했습니다",
  COMMENT_ADDED: "댓글을 작성했습니다",
};
