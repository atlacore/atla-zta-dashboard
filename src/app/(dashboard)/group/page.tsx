"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { notify } from "@components/Notification";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { PageNotFound } from "@components/ui/PageNotFound";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useRedirect from "@hooks/useRedirect";
import { useApiCall } from "@utils/api";
import { FolderGit2Icon, PencilIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useSWRConfig } from "swr";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";
import PageContainer from "@/layouts/PageContainer";
import { EditGroupNameModal } from "@/modules/groups/EditGroupNameModal";

export default function GroupPage() {
  const queryParameter = useSearchParams();
  const { permission } = usePermissions();
  const groupId = queryParameter.get("id");
  const { groups, isLoading } = useGroups();

  useRedirect("/groups", false, !groupId);

  if (!permission.groups.read) {
    return (
      <PageContainer>
        <RestrictedAccess page={"Group Information"} />
      </PageContainer>
    );
  }

  if (isLoading) return <FullScreenLoading />;

  const group = groups?.find((g) => g.id === groupId);

  if (!group) {
    return (
      <PageNotFound
        title={"Group not found"}
        description={
          "The group you are attempting to access cannot be found. It may have been deleted."
        }
      />
    );
  }

  return <TenantDetail group={group} />;
}

function TenantDetail({ group }: { group: Group }) {
  const { permission } = usePermissions();
  const [renameOpen, setRenameOpen] = useState(false);
  const { mutate } = useSWRConfig();
  const tenantRequest = useApiCall<{ id: string; name: string }>(
    "/ui/tenants/" + group.id,
  );

  const renameGroup = (name: string) => {
    const promise = tenantRequest.put({ name }).then(() => {
      mutate("/ui/tenants");
    });

    notify({
      title: "Rename Group",
      description: "Group successfully renamed to " + name,
      promise,
      loadingMessage: "Renaming group...",
    });

    return promise;
  };

  return (
    <PageContainer>
      <EditGroupNameModal
        initialName={group.name}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        onSuccess={(newName) =>
          renameGroup(newName).then(() => setRenameOpen(false))
        }
      />
      <div className={"p-default py-6 mb-4"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/groups"}
            label={"Groups"}
            icon={<FolderGit2Icon size={14} />}
          />
          <Breadcrumbs.Item label={group.name} active />
        </Breadcrumbs>

        <div className={"flex items-center gap-3"}>
          <h1>{group.name}</h1>
          {permission?.groups?.update && (
            <Button
              variant={"secondary"}
              className={"!px-2"}
              onClick={() => setRenameOpen(true)}
            >
              <PencilIcon size={14} />
            </Button>
          )}
        </div>

        <div className={"mt-4 text-sm text-nb-gray-400"}>
          <p>
            <span className={"font-medium text-nb-gray-300"}>Group ID:</span>{" "}
            <span className={"font-mono"}>{group.id}</span>
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
