"use client";

import useFetchApi, { useApiCall } from "@utils/api";
import { sortBy, unionBy } from "lodash";
import React, { useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Group } from "@/interfaces/Group";

type Props = {
  children: React.ReactNode;
};

const GroupContext = React.createContext(
  {} as {
    groups: Group[] | undefined;
    refresh: () => void;
    dropdownOptions: Group[];
    setDropdownOptions: React.Dispatch<React.SetStateAction<Group[]>>;
    addDropdownOptions: (options: Group[]) => void;
    isLoading: boolean;
    createOrUpdate: (group: Group) => Promise<Group>;
    reset: () => void;
    updateGroupDropdown: (oldGroupName: string, newGroup: Group) => void;
    deleteGroupDropdownOption: (name: string) => void;
  },
);

export default function GroupsProvider({ children }: Props) {
  const { isRestricted } = usePermissions();

  return isRestricted ? (
    <>{children}</>
  ) : (
    <GroupsProviderContent>{children}</GroupsProviderContent>
  );
}

type ProviderContentProps = {
  children: React.ReactNode;
};

/** Maps a tenant returned from GET /ui/tenants to the Group shape used across the dashboard. */
function tenantToGroup(t: { id: string; name: string }): Group {
  return { id: t.id, name: t.name };
}

export function GroupsProviderContent({ children }: Readonly<ProviderContentProps>) {
  const { permission } = usePermissions();

  const {
    data: rawTenants,
    mutate,
    isLoading,
  } = useFetchApi<{ id: string; name: string }[]>("/ui/tenants", false, true, permission.groups.read);

  const groupRequest = useApiCall<{ id: string; name: string }>("/ui/tenants", true);
  const [dropdownOptions, setDropdownOptions] = useState<Group[]>([]);

  const groups = useMemo<Group[] | undefined>(
    () => rawTenants?.map(tenantToGroup),
    [rawTenants],
  );

  const refresh = () => {
    if (groups && !isLoading) mutate().then();
  };

  const reset = () => {
    mutate();
    setDropdownOptions([]);
    addDropdownOptions(groups || []);
  };

  const addDropdownOptions = (options: Group[]) => {
    setDropdownOptions((prev) => {
      const union = unionBy(options, prev, "name");
      return sortBy(union, "name");
    });
  };

  const updateGroupDropdown = (oldGroupName: string, newGroup: Group) => {
    setDropdownOptions((prev) =>
      sortBy(
        prev.map((g) => (g.name === oldGroupName ? newGroup : g)),
        "name",
      ),
    );
  };

  useEffect(() => {
    if (!groups) return;
    const sorted = sortBy([...groups], "name");
    const clientOnly = dropdownOptions.filter((g) => g.keepClientState);
    addDropdownOptions(unionBy(clientOnly, sorted, "name"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const createOrUpdate = async (group: Group): Promise<Group> => {
    const existing = groups?.find((g) => g.id === group.id || g.name === group.name);
    if (existing?.id) {
      return groupRequest
        .put({ name: group.name }, `/${existing.id}`)
        .then(tenantToGroup);
    }
    return groupRequest.post({ name: group.name }).then(tenantToGroup);
  };

  const deleteGroupDropdownOption = (name: string) => {
    setDropdownOptions((prev) => sortBy(prev.filter((g) => g.name !== name), "name"));
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        refresh,
        dropdownOptions,
        setDropdownOptions,
        addDropdownOptions,
        isLoading,
        createOrUpdate,
        reset,
        updateGroupDropdown,
        deleteGroupDropdownOption,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export const useGroups = () => React.useContext(GroupContext);
