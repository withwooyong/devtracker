"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading, setUser } = useAuthStore();

  useEffect(() => {
    if (user) return;

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, [user, setUser]);

  return { user, isLoading };
}
