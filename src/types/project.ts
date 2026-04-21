export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  githubRepo?: string | null;
  githubWebhookSecretSet?: boolean;
  createdById: string;
  createdAt: string;
  _count?: {
    issues: number;
    deployments: number;
  };
}
