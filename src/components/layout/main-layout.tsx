"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUIStore } from "@/stores/ui-store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { ReactNode } from "react";

export function MainLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const isSidebarOpen = useUIStore((s) => s.isSidebarOpen);
  const closeSidebar = useUIStore((s) => s.closeSidebar);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const drawerOpen = !isDesktop && isSidebarOpen;
  const wasDrawerOpen = useRef(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeSidebar]);

  useEffect(() => {
    if (wasDrawerOpen.current && !drawerOpen) {
      const trigger = document.querySelector<HTMLButtonElement>(
        "[data-sidebar-trigger]"
      );
      trigger?.focus();
    }
    wasDrawerOpen.current = drawerOpen;
  }, [drawerOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <div
        className="flex-1 flex flex-col min-w-0"
        inert={drawerOpen}
      >
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
