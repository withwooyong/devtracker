import { create } from "zustand";
import type { IssueStatus, IssuePriority } from "@/types/issue";

interface FilterState {
  status: IssueStatus | "ALL";
  priority: IssuePriority | "ALL";
  assigneeId: string | "ALL";
  search: string;
  setStatus: (status: IssueStatus | "ALL") => void;
  setPriority: (priority: IssuePriority | "ALL") => void;
  setAssigneeId: (assigneeId: string | "ALL") => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  status: "ALL",
  priority: "ALL",
  assigneeId: "ALL",
  search: "",
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  setAssigneeId: (assigneeId) => set({ assigneeId }),
  setSearch: (search) => set({ search }),
  reset: () =>
    set({ status: "ALL", priority: "ALL", assigneeId: "ALL", search: "" }),
}));
