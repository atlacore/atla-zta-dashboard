import { useCallback, useState } from "react";

// Mirrors the backend limits; the server validates the real content again.
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_ACCEPT = "image/png,image/jpeg,image/webp,.txt,.log";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const TEXT_EXTENSIONS = [".txt", ".log"];

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns a message for a file that must be refused, or null when it is fine.
export function attachmentProblem(file: File): string | null {
  const isImage = IMAGE_TYPES.includes(file.type);
  const lowerName = file.name.toLowerCase();
  const isText = TEXT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (!isImage && !isText) {
    return `${file.name}: only PNG, JPEG, WebP images and .txt/.log files are allowed`;
  }
  if (file.size === 0) return `${file.name}: the file is empty`;
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `${file.name}: larger than ${formatSize(MAX_ATTACHMENT_BYTES)}`;
  }
  return null;
}

export function useAttachments() {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    (incoming: File[]) => {
      const next = [...files];
      let problem: string | null = null;
      for (const file of incoming) {
        if (next.length >= MAX_ATTACHMENTS) {
          problem = `At most ${MAX_ATTACHMENTS} files per message`;
          break;
        }
        const refusal = attachmentProblem(file);
        if (refusal) {
          problem = refusal;
          continue;
        }
        next.push(file);
      }
      setFiles(next);
      setError(problem);
    },
    [files],
  );

  const remove = useCallback((index: number) => {
    setError(null);
    setFiles((current) => current.filter((_, position) => position !== index));
  }, []);

  const clear = useCallback(() => {
    setError(null);
    setFiles([]);
  }, []);

  return { files, error, add, remove, clear };
}

// JSON when there is nothing to attach, multipart otherwise; the backend accepts both.
export function buildSupportBody(
  fields: Record<string, string | undefined>,
  files: File[],
): Record<string, string | undefined> | FormData {
  if (files.length === 0) return fields;
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, value);
  }
  files.forEach((file) => form.append("attachments", file, file.name));
  return form;
}
