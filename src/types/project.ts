export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  createdById: string;
  createdAt: string;
  _count?: {
    issues: number;
    deployments: number;
  };
}
