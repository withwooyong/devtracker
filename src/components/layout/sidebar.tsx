"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: "📊" },
  { href: "/projects", label: "프로젝트", icon: "📁" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">DevTracker</h1>
        <p className="text-xs text-gray-400 mt-1">개발 업무 관리</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <span>{item.icon}</span>
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
            className={`mt-3 block text-center text-xs py-1.5 border rounded transition-colors ${
              pathname.startsWith("/settings")
                ? "border-blue-500 text-white"
                : "border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
            }`}
          >
            내 프로필
          </Link>
          <button
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
