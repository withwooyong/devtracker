"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NotificationDropdown } from "@/components/common/notification-dropdown";

export function Header() {
  const pathname = usePathname();

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, arr) => ({
      label: decodeURIComponent(segment),
      href: "/" + arr.slice(0, index + 1).join("/"),
    }));

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {i > 0 && <span>/</span>}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-gray-900 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-gray-700">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>
      <NotificationDropdown />
    </header>
  );
}
