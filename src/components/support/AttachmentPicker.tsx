"use client";

import Button from "@components/Button";
import { Paperclip, X } from "lucide-react";
import React, { useRef } from "react";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  formatSize,
} from "@/hooks/useAttachments";

type Props = Readonly<{
  files: File[];
  error: string | null;
  disabled?: boolean;
  // Shown on the same row as Attach, right-aligned (e.g. the send button).
  actions?: React.ReactNode;
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}>;

// A paperclip button with the list of chosen files; pasting is handled by the caller's text field.
export default function AttachmentPicker({
  files,
  error,
  disabled,
  actions,
  onAdd,
  onRemove,
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className={"flex flex-col gap-2"}>
      <div className={"flex items-center gap-2"}>
        <Button
          variant={"secondaryLighter"}
          size={"xs"}
          disabled={disabled || files.length >= MAX_ATTACHMENTS}
          onClick={() => input.current?.click()}
        >
          <Paperclip size={14} />
          Attach
        </Button>
        {actions && <div className={"ml-auto"}>{actions}</div>}
        <input
          ref={input}
          type={"file"}
          multiple
          hidden
          accept={ATTACHMENT_ACCEPT}
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      <p className={"text-xs text-nb-gray-500"}>
        Screenshots (PNG, JPEG, WebP) or .txt/.log, up to {MAX_ATTACHMENTS}{" "}
        files, 10 MB each
      </p>

      {files.length > 0 && (
        <ul className={"flex flex-wrap gap-2"}>
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className={
                "flex items-center gap-2 rounded-md border border-nb-gray-800 bg-nb-gray-900 px-2 py-1 text-xs text-nb-gray-200"
              }
            >
              <span className={"max-w-[10rem] truncate"} title={file.name}>
                {file.name}
              </span>
              <span className={"text-nb-gray-500"}>{formatSize(file.size)}</span>
              <button
                type={"button"}
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                className={"text-nb-gray-400 hover:text-white"}
                onClick={() => onRemove(index)}
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className={"text-xs text-red-500"}>{error}</p>}
    </div>
  );
}

// Screenshots pasted into a text field become attachments, other pastes are left alone.
export function pastedImages(event: React.ClipboardEvent): File[] {
  return Array.from(event.clipboardData.files).filter((file) =>
    file.type.startsWith("image/"),
  );
}
