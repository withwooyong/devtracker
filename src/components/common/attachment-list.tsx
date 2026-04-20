"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Attachment } from "@/types/attachment";
import { MAX_ATTACHMENT_SIZE } from "@/types/attachment";
import { useAuthStore } from "@/stores/auth-store";

interface Props {
  projectKey: string;
  issueNumber: number;
  issueId: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}

export function AttachmentList({ projectKey, issueNumber, issueId }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ attachments: Attachment[] }>({
    queryKey: ["attachments", projectKey, issueNumber],
    queryFn: () =>
      fetch(
        `/api/projects/${projectKey}/issues/${issueId}/attachments`
      ).then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      }),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `/api/projects/${projectKey}/issues/${issueId}/attachments`,
        { method: "POST", body: fd }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "업로드 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", projectKey, issueNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", projectKey, issueNumber],
      });
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const res = await fetch(
        `/api/projects/${projectKey}/issues/${issueId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "삭제 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", projectKey, issueNumber],
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", projectKey, issueNumber],
      });
    },
    onError: (err: Error) => setError(err.message),
  });

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError("파일 크기는 4MB 이하로 제한됩니다.");
      return;
    }
    uploadMutation.mutate(file);
  }

  const attachments = data?.attachments ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">
          첨부파일{" "}
          <span className="text-gray-400 font-normal">
            ({attachments.length})
          </span>
        </h3>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`m-4 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-200 hover:border-gray-300"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <p className="text-sm text-gray-500">
          파일을 여기에 놓거나{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-blue-600 hover:underline font-medium"
          >
            클릭하여 선택
          </button>
        </p>
        <p className="text-xs text-gray-400 mt-1">최대 4MB</p>
        {uploadMutation.isPending && (
          <p className="text-xs text-blue-600 mt-2">업로드 중…</p>
        )}
        {error && (
          <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </p>
        )}
      </div>

      <div className="px-4 pb-4">
        {isLoading ? (
          <p className="text-xs text-gray-400 py-2">불러오는 중…</p>
        ) : attachments.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">
            첨부된 파일이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
            {attachments.map((att) => {
              const canDelete =
                user?.id === att.userId || user?.role === "ADMIN";
              const downloadUrl = `/api/projects/${projectKey}/issues/${issueId}/attachments/${att.id}/download`;
              return (
                <li
                  key={att.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  {isImage(att.mimeType) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={downloadUrl}
                      alt={att.filename}
                      className="w-10 h-10 object-cover rounded border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center rounded bg-gray-100 text-gray-500 text-xs">
                      📎
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-900 hover:text-blue-600 truncate block"
                    >
                      {att.filename}
                    </a>
                    <p className="text-xs text-gray-400">
                      {formatSize(att.size)}
                      {att.user?.name ? ` · ${att.user.name}` : ""}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => {
                        if (confirm("첨부파일을 삭제하시겠습니까?")) {
                          deleteMutation.mutate(att.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-gray-400 hover:text-red-600 px-2 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
