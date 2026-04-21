export type GitHubLinkType = "PR" | "COMMIT" | "BRANCH";
export type GitHubLinkStatus = "open" | "closed" | "merged";

// type/status는 Prisma 스키마상 String 이라 DB에 예상 외 값이 들어올 수 있다.
// 인터페이스는 런타임 실제와 맞춰 string으로 두고, 좁힘은 아래 타입 가드로 한다.
export interface GitHubLink {
  id: string;
  issueId: string;
  type: string;
  url: string;
  title: string;
  status?: string | null;
  externalId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const GITHUB_LINK_TYPE_VALUES: readonly GitHubLinkType[] = [
  "PR",
  "COMMIT",
  "BRANCH",
];
const GITHUB_LINK_STATUS_VALUES: readonly GitHubLinkStatus[] = [
  "open",
  "closed",
  "merged",
];

export function isGitHubLinkType(v: unknown): v is GitHubLinkType {
  return typeof v === "string" &&
    (GITHUB_LINK_TYPE_VALUES as readonly string[]).includes(v);
}

export function isGitHubLinkStatus(v: unknown): v is GitHubLinkStatus {
  return typeof v === "string" &&
    (GITHUB_LINK_STATUS_VALUES as readonly string[]).includes(v);
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
