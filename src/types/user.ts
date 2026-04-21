export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
  avatarUrl?: string | null;
  githubLogin?: string | null;
}
