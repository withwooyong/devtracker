"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  exact?: boolean;
}

export function ProjectTabs({ projectKey }: { projectKey: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectKey}`;

  const tabs: Tab[] = [
    { href: base, label: "이슈 목록", exact: true },
    { href: `${base}/board`, label: "칸반 보드" },
    { href: `${base}/sprints`, label: "스프린트" },
    { href: `${base}/deployments`, label: "배포 이력" },
    { href: `${base}/settings`, label: "설정" },
  ];

  function isActive(tab: Tab) {
    if (tab.exact) return pathname === tab.href;
    return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
  }

  return (
    <nav
      className="flex gap-3 mt-2 text-sm overflow-x-auto min-w-0 -mx-1 px-1"
      aria-label="프로젝트 탭"
    >
      {tabs.map((tab) => {
        const active = isActive(tab);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap pb-1 ${
              active
                ? "text-primary font-medium border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
