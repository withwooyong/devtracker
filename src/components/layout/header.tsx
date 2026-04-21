"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NotificationDropdown } from "@/components/common/notification-dropdown";
import { useUIStore } from "@/stores/ui-store";

export function Header() {
  const pathname = usePathname();
  const { openSidebar } = useUIStore();

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, arr) => ({
      label: decodeURIComponent(segment),
      href: "/" + arr.slice(0, index + 1).join("/"),
    }));

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          onClick={openSidebar}
          data-sidebar-trigger
          className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
          aria-label="사이드바 열기"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <nav className="flex items-center gap-2 text-sm text-gray-500 min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, i) => (
            <span
              key={crumb.href}
              className={`flex items-center gap-2 ${
                i === breadcrumbs.length - 1 ? "min-w-0" : "hidden sm:flex"
              }`}
            >
              {i > 0 && <span className="text-gray-400">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-gray-900 font-medium truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-gray-700 truncate max-w-[10rem]"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
      <NotificationDropdown />
    </header>
  );
}
