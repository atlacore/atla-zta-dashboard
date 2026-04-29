"use client";

import React, { useMemo } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { Permission, Permissions } from "@/interfaces/Permission";

type Props = {
  children: React.ReactNode;
};

const full: Permission = { create: true, read: true, update: true, delete: true };
const readOnly: Permission = { create: false, read: true, update: false, delete: false };
const none: Permission = { create: false, read: false, update: false, delete: false };

function buildPermissions(role: string | undefined): { isRestricted: boolean; permission: Permissions["modules"] } {
  const isAdmin = role === "owner" || role === "admin";
  const isAuditor = role === "auditor";

  const rw = isAdmin ? full : isAuditor ? readOnly : none;
  const ro = isAdmin || isAuditor ? readOnly : none;

  return {
    isRestricted: !isAdmin,
    permission: {
      peers: rw,
      groups: rw,
      setup_keys: rw,
      policies: rw,
      assistant: rw,
      networks: rw,
      routes: rw,
      nameservers: rw,
      dns: rw,
      users: rw,
      pats: rw,
      events: ro,
      settings: isAdmin ? full : none,
      accounts: isAdmin ? full : none,
      billing: none,
      identity_providers: none,
      edr: rw,
      event_streaming: rw,
      idp: none,
      msp: none,
      tenants: rw,
      proxy: rw,
      proxy_configuration: rw,
      services: rw,
    },
  };
}

const PermissionsContext = React.createContext(
  {} as {
    isRestricted: boolean;
    permission: Permissions["modules"];
  },
);

export default function PermissionsProvider({ children }: Props) {
  const { loggedInUser } = useLoggedInUser();

  const data = useMemo(
    () => buildPermissions(loggedInUser?.role),
    [loggedInUser?.role],
  );

  // Don't render children until we know the user's role.
  // Without this, all permission checks evaluate to `none` and pages show RestrictedAccess.
  if (!loggedInUser) return null;

  return (
    <PermissionsContext.Provider value={data}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => React.useContext(PermissionsContext);
