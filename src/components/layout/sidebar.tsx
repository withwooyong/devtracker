"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useMediaQuery } from "@/hooks/use-media-query";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: "📊" },
  { href: "/projects", label: "프로젝트", icon: "📁" },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);
  const closeSidebar = useUIStore((s) => s.closeSidebar);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  const asDialog = !isDesktop && isSidebarOpen;

  useEffect(() => {
    if (asDialog) {
      firstLinkRef.current?.focus();
    }
  }, [asDialog]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:transform-none lg:min-h-screen ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      role={asDialog ? "dialog" : undefined}
      aria-modal={asDialog ? true : undefined}
      aria-label="사이드바"
    >
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">DevTracker</h1>
          <p className="text-xs text-gray-400 mt-1">개발 업무 관리</p>
        </div>
        <button
          type="button"
          onClick={closeSidebar}
          className="lg:hidden text-gray-400 hover:text-white p-1 -mr-1"
          aria-label="사이드바 닫기"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item, idx) => (
          <Link
            key={item.href}
            ref={idx === 0 ? firstLinkRef : undefined}
            href={item.href}
            onClick={closeSidebar}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <Link
            href="/settings"
            onClick={closeSidebar}
            className={`mt-3 block text-center text-xs py-1.5 border rounded transition-colors ${
              pathname.startsWith("/settings")
                ? "border-blue-500 text-white"
                : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            내 프로필
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full text-xs text-gray-400 hover:text-white py-1.5 border border-gray-700 rounded hover:border-gray-600 transition-colors"
          >
            로그아웃
          </button>
        </div>
      )}
    </aside>
  );
}
