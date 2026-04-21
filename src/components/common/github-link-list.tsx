"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type GitHubLink,
  GITHUB_LINK_STATUS_COLORS,
  GITHUB_LINK_STATUS_LABELS,
  GITHUB_LINK_TYPE_COLORS,
  GITHUB_LINK_TYPE_LABELS,
  formatGitHubLinkExternalHint,
  type GitHubLinkStatus,
  type GitHubLinkType,
} from "@/types/github-link";

interface Props {
  projectKey: string;
  issueNumber: number;
  issueId: string;
}

export function GitHubLinkList({ projectKey, issueNumber, issueId }: Props) {
  const { data, isLoading } = useQuery<{ githubLinks: GitHubLink[] }>({
    queryKey: ["github-links", projectKey, issueNumber],
    queryFn: () =>
      fetch(
        `/api/projects/${projectKey}/issues/${issueId}/github-links`
      ).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const links = data?.githubLinks ?? [];

  if (!isLoading && links.length === 0) return null;

  return (
    <div
      data-testid="github-link-section"
      className="bg-white border border-gray-200 rounded-lg"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">
          GitHub{" "}
          <span className="text-gray-400 font-normal">({links.length})</span>
        </h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {isLoading ? (
          <li className="px-4 py-3 text-xs text-gray-400">불러오는 중…</li>
        ) : (
          links.map((link) => {
            const type = link.type as GitHubLinkType;
            const hint = formatGitHubLinkExternalHint(type, link.externalId);
            return (
              <li
                key={link.id}
                className="px-4 py-2.5 flex items-center gap-3"
              >
                <span
                  data-testid={`gh-link-type-${link.id}`}
                  className={`text-[11px] leading-4 font-medium px-1.5 py-0.5 rounded ${
                    GITHUB_LINK_TYPE_COLORS[type] ??
                    "bg-gray-50 text-gray-600 border border-gray-200"
                  }`}
                >
                  {GITHUB_LINK_TYPE_LABELS[type] ?? link.type}
                </span>
                {hint && (
                  <span
                    data-testid={`gh-link-hint-${link.id}`}
                    className="text-xs font-mono text-gray-400"
                  >
                    {hint}
                  </span>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-gray-800 hover:text-blue-600 truncate"
                >
                  {link.title}
                </a>
                {link.status && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      GITHUB_LINK_STATUS_COLORS[
                        link.status as GitHubLinkStatus
                      ] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {GITHUB_LINK_STATUS_LABELS[
                      link.status as GitHubLinkStatus
                    ] ?? link.status}
                  </span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
