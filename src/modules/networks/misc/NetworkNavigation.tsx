import SidebarItem from "@components/SidebarItem";
import * as React from "react";
import NetworkRoutesIcon from "@/assets/icons/NetworkRoutesIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";

export const NetworkNavigation = () => {
  const { permission } = usePermissions();
  // Points at the atla-native pages backed by /api/ui/networks and /api/ui/routes.
  // The legacy /networks and /network-routes pages remain on disk but are no
  // longer reachable through the sidebar.
  return (
    <>
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        label={"Networks"}
        href={"/atla-networks"}
        visible={permission.networks.read}
      />
      <SidebarItem
        icon={<NetworkRoutesIcon />}
        href={"/atla-routes"}
        label={"Network Routes"}
        visible={permission.routes.read}
      />
    </>
  );
};
