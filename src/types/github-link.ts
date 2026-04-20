export type GitHubLinkType = "PR" | "COMMIT" | "BRANCH";
export type GitHubLinkStatus = "open" | "closed" | "merged";

export interface GitHubLink {
  id: string;
  issueId: string;
  type: GitHubLinkType;
  url: string;
  title: string;
  status?: GitHubLinkStatus | null;
  externalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const GITHUB_LINK_STATUS_COLORS: Record<GitHubLinkStatus, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  merged: "bg-purple-100 text-purple-700",
};

export const GITHUB_LINK_STATUS_LABELS: Record<GitHubLinkStatus, string> = {
  open: "열림",
  closed: "닫힘",
  merged: "머지됨",
};
