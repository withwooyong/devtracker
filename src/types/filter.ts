export interface SavedFilter {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  filters: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    search?: string;
  };
  isShared: boolean;
  createdAt: string;
  user?: { id: string; name: string };
}
