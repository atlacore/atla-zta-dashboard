"use client";

import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import * as React from "react";
import { useDialog } from "@/contexts/DialogProvider";
import { useGroups } from "@/contexts/GroupsProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";

type Props = {
  group: Group;
  children?: React.ReactNode;
  isDetailPage?: boolean;
};

const GroupContext = React.createContext(
  {} as {
    group: Group;
    deleteGroup: () => Promise<void>;
    renameGroup: (name: string) => Promise<void>;
  },
);

export const GroupProvider = ({
  group,
  children,
  isDetailPage = true,
}: Props) => {
  const { permission } = usePermissions();
  const { deleteGroupDropdownOption, updateGroupDropdown, refresh } = useGroups();
  const tenantRequest = useApiCall<{ id: string; name: string }>("/ui/tenants/" + group.id);
  const { confirm } = useDialog();

  const handleDelete = async () => {
    const promise = tenantRequest.del().then(() => {
      deleteGroupDropdownOption(group.name);
      refresh();
    });

    notify({
      title: "Delete Tenant " + group.name,
      description: "Tenant successfully deleted",
      promise,
      loadingMessage: "Deleting tenant...",
    });

    return promise;
  };

  const deleteGroup = async () => {
    if (!permission?.groups?.delete) return;
    const choice = await confirm({
      title: `Delete tenant '${group.name}'?`,
      description:
        "Every active session of the tenant is revoked, and its users can no longer sign in or connect. This action cannot be undone from the dashboard.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });
    if (!choice) return;
    handleDelete().then();
  };

  const renameGroup = async (name: string) => {
    if (!permission?.groups?.update) return Promise.reject("Not allowed to rename");

    const promise = tenantRequest
      .put({ name })
      .then(() => {
        updateGroupDropdown(group.name, { ...group, name });
        refresh();
      });

    notify({
      title: `Rename Tenant ${group.name}`,
      description: "Tenant successfully renamed to " + name,
      promise,
      loadingMessage: "Renaming tenant...",
    });

    return promise;
  };

  return (
    <GroupContext.Provider value={{ group, deleteGroup, renameGroup }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroupContext = () => {
  const context = React.useContext(GroupContext);
  if (!context) {
    throw new Error("useGroupContext must be used within a GroupProvider");
  }
  return context;
};
