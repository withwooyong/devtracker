"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type GitHubLink,
  GITHUB_LINK_STATUS_COLORS,
  GITHUB_LINK_STATUS_LABELS,
  GITHUB_LINK_TYPE_COLORS,
  GITHUB_LINK_TYPE_LABELS,
  formatGitHubLinkExternalHint,
  isGitHubLinkStatus,
  isGitHubLinkType,
} from "@/types/github-link";

interface Props {
  projectKey: string;
  issueNumber: number;
  issueId: string;
}

const UNKNOWN_TYPE_PILL =
  "bg-gray-50 text-gray-600 border border-gray-200";
const UNKNOWN_STATUS_PILL = "bg-gray-100 text-gray-600";

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
            const knownType = isGitHubLinkType(link.type) ? link.type : null;
            const typeLabel = knownType
              ? GITHUB_LINK_TYPE_LABELS[knownType]
              : link.type;
            const typeColor = knownType
              ? GITHUB_LINK_TYPE_COLORS[knownType]
              : UNKNOWN_TYPE_PILL;
            const hint = knownType
              ? formatGitHubLinkExternalHint(knownType, link.externalId)
              : null;

            const knownStatus = isGitHubLinkStatus(link.status)
              ? link.status
              : null;
            const statusLabel = knownStatus
              ? GITHUB_LINK_STATUS_LABELS[knownStatus]
              : link.status ?? null;
            const statusColor = knownStatus
              ? GITHUB_LINK_STATUS_COLORS[knownStatus]
              : UNKNOWN_STATUS_PILL;

            // 보조기술에는 "타입 힌트: 제목"을 한 문장으로 낭독되도록 통합.
            // typeLabel이 빈 문자열(DB에 이상값)인 경우 "링크"로 폴백해 접근명이
            // 콜론으로 시작하지 않도록 방어.
            const safeTypeLabel = typeLabel?.trim() ? typeLabel : "링크";
            const ariaLabel = [safeTypeLabel, hint].filter(Boolean).join(" ") +
              (link.title ? `: ${link.title}` : "");

            return (
              <li
                key={link.id}
                className="px-4 py-2.5 flex items-center gap-3"
              >
                <span
                  data-testid={`gh-link-type-${link.id}`}
                  aria-hidden="true"
                  className={`text-[11px] leading-4 font-medium px-1.5 py-0.5 rounded ${typeColor}`}
                >
                  {typeLabel}
                </span>
                {hint && (
                  <span
                    data-testid={`gh-link-hint-${link.id}`}
                    aria-hidden="true"
                    className="text-xs font-mono text-gray-400"
                  >
                    {hint}
                  </span>
                )}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ariaLabel}
                  className="flex-1 text-sm text-gray-800 hover:text-blue-600 truncate"
                >
                  {link.title}
                </a>
                {statusLabel && (
                  <span
                    aria-hidden="true"
                    className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}
                  >
                    {statusLabel}
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
