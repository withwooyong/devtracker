"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type Notification,
  NOTIFICATION_TYPE_ICONS,
} from "@/types/notification";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery<{
    notifications: Notification[];
    unreadCount: number;
  }>({
    queryKey: ["notifications"],
    queryFn: () =>
      fetch("/api/notifications").then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (payload: { ids?: string[]; markAll?: boolean }) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
          }
          setOpen((v) => !v);
        }}
        aria-label="알림"
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
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
            strokeWidth={1.8}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-30">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 sticky top-0 bg-white">
            <span className="text-sm font-medium text-gray-800">알림</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markRead.mutate({ markAll: true })}
                className="text-xs text-blue-600 hover:underline"
              >
                모두 읽음
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-400">
              새 알림이 없습니다.
            </p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    n.isRead ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <Link
                    href={n.link}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate({ ids: [n.id] });
                      setOpen(false);
                    }}
                    className="block px-4 py-2.5 hover:bg-gray-50"
                  >
                    <div className="flex gap-2">
                      <span aria-hidden className="text-base leading-none">
                        {NOTIFICATION_TYPE_ICONS[n.type] ?? "🔔"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {n.message}
                          </p>
                        )}
                        <p className="text-[11px] text-gray-400 mt-1">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
