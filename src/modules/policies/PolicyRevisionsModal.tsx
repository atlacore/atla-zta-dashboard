"use client";

import Button from "@components/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/Dialog";
import { notify } from "@components/Notification";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import { HistoryIcon, Trash2 } from "lucide-react";
import React from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { RawPolicy } from "@/interfaces/RawPolicy";

type Props = {
  name: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export default function PolicyRevisionsModal({
  name,
  open,
  onOpenChange,
}: Readonly<Props>) {
  const { permission } = usePermissions();
  const { confirm } = useDialog();
  const revisionRequest = useApiCall<{ status: string }>("/ui/policies/revisions");

  const {
    data: revisions,
    isLoading,
    mutate,
  } = useFetchApi<RawPolicy[]>(`/ui/policies/${encodeURIComponent(name)}/revisions`, true, false, open);

  const deleteRevision = async (revision: RawPolicy) => {
    const choice = await confirm({
      title: `Delete revision ${revision.revision}?`,
      description:
        "This revision will be permanently removed. If it is the latest revision, the PDP falls back to the next most recent one.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;

    const promise = revisionRequest.del(undefined, `/${revision.id}`).then(() => mutate());
    notify({
      title: "Delete Revision",
      description: `Revision ${revision.revision} deleted.`,
      promise,
      loadingMessage: "Deleting...",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={"max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>
            <div className={"flex items-center gap-2"}>
              <HistoryIcon size={16} />
              Revisions of &apos;{name}&apos;
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className={"px-8 pb-6"}>
          {isLoading && <SkeletonTable />}
          {!isLoading && (
            <ul className={"flex flex-col divide-y dark:divide-nb-gray-900 border dark:border-nb-gray-900 rounded-md"}>
              {revisions?.map((rev) => (
                <li
                  key={rev.id}
                  className={"px-4 py-2.5 flex items-center justify-between gap-4"}
                >
                  <div className={"flex items-center gap-3"}>
                    <span className={"text-sm font-medium"}>
                      Rev. {rev.revision}
                    </span>
                    <span className={"font-mono text-xs text-nb-gray-400"}>
                      {rev.hash.slice(0, 12)}
                    </span>
                    <span className={"text-xs text-nb-gray-400"}>
                      {dayjs(rev.created_at).format("MMM D, YYYY HH:mm")}
                    </span>
                  </div>
                  <Button
                    variant={"danger-outline"}
                    size={"sm"}
                    onClick={() => deleteRevision(rev)}
                    disabled={!permission.policies?.delete}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
              {!revisions?.length && (
                <li className={"px-4 py-3 text-sm text-nb-gray-400"}>
                  No revisions found.
                </li>
              )}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
