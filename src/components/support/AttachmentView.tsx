"use client";

import { useAtlaFetch } from "@utils/api";
import { FileText, ImageIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { formatSize } from "@/hooks/useAttachments";
import { TicketAttachment } from "@/interfaces/Support";

type Props = Readonly<{
  ticketId: number;
  attachment: TicketAttachment;
}>;

// Files come through the control plane with the user's token, a plain <img src> could not send it.
function useAttachmentBlob(url: string, enabled: boolean) {
  const { fetcher } = useAtlaFetch(true);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let revoked: string | null = null;
    let cancelled = false;
    fetcher("GET", url, undefined, { blob: true })
      .then((blob: Blob) => {
        if (cancelled) return;
        revoked = URL.createObjectURL(blob);
        setObjectUrl(revoked);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  return { objectUrl, failed, fetcher };
}

export default function AttachmentView({ ticketId, attachment }: Props) {
  const url = `/ui/support/tickets/${ticketId}/attachments/${attachment.id}`;
  const isImage = attachment.kind === "image";
  const { objectUrl, failed, fetcher } = useAttachmentBlob(url, isImage);

  if (isImage) {
    if (failed) {
      return (
        <span className={"flex items-center gap-2 text-xs text-nb-gray-500"}>
          <ImageIcon size={14} />
          {attachment.name} could not be loaded
        </span>
      );
    }
    return objectUrl ? (
      <a href={objectUrl} target={"_blank"} rel={"noopener noreferrer"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={objectUrl}
          alt={attachment.name}
          className={
            "max-h-56 max-w-full rounded-md border border-nb-gray-800 object-contain"
          }
        />
      </a>
    ) : (
      <div className={"h-24 w-40 animate-pulse rounded-md bg-nb-gray-900"} />
    );
  }

  const download = async () => {
    const blob: Blob = await fetcher("GET", url, undefined, { blob: true });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = attachment.name;
    link.click();
    URL.revokeObjectURL(href);
  };

  return (
    <button
      type={"button"}
      onClick={() => download().catch(() => undefined)}
      className={
        "flex items-center gap-2 rounded-md border border-nb-gray-800 bg-nb-gray-900 px-3 py-2 text-xs text-nb-gray-200 hover:bg-nb-gray-800"
      }
    >
      <FileText size={14} />
      <span className={"max-w-[14rem] truncate"}>{attachment.name}</span>
      <span className={"text-nb-gray-500"}>{formatSize(attachment.size)}</span>
    </button>
  );
}
