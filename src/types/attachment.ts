export interface Attachment {
  id: string;
  issueId: string;
  userId: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024; // 4MB (Vercel 함수 body 제한 ~4.5MB)
export const MAX_ATTACHMENTS_PER_ISSUE = 20;

export const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "application/zip",
  "text/",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
];
