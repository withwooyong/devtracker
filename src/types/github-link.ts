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

export const GITHUB_LINK_TYPE_LABELS: Record<GitHubLinkType, string> = {
  PR: "PR",
  COMMIT: "커밋",
  BRANCH: "브랜치",
};

// 타입별 pill 스타일. 상태 pill과 같은 채도대를 피해 혼동 방지.
export const GITHUB_LINK_TYPE_COLORS: Record<GitHubLinkType, string> = {
  PR: "bg-blue-50 text-blue-700 border border-blue-200",
  COMMIT: "bg-slate-50 text-slate-700 border border-slate-200",
  BRANCH: "bg-amber-50 text-amber-700 border border-amber-200",
};

// 외부 ID 힌트(PR 번호 또는 커밋 SHA 앞 7자)
export function formatGitHubLinkExternalHint(
  type: GitHubLinkType,
  externalId: string | null | undefined
): string | null {
  if (!externalId) return null;
  if (type === "PR") return `#${externalId}`;
  if (type === "COMMIT") return externalId.slice(0, 7);
  return null;
}
