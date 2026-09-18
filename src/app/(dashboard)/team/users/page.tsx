"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { User2 } from "lucide-react";
import React, { lazy, Suspense } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Invite } from "@/interfaces/Invite";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import UserInvitesTable, { InviteUserButton } from "@/modules/users/UserInvitesTable";

const UsersTable = lazy(() => import("@/modules/users/UsersTable"));

export default function TeamUsers() {
  const { permission } = usePermissions();
  const { data: users, isLoading } = useFetchApi<User[]>(
    "/ui/users",
  );
  const { data: invites, isLoading: invitesLoading } = useFetchApi<Invite[]>(
    "/ui/users/invites",
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team"}
            label={"Team"}
            icon={<TeamIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/team/users"}
            label={"Users"}
            active
            icon={<User2 size={16} />}
          />
        </Breadcrumbs>
        <h1 ref={headingRef}>Users</h1>
        <Paragraph>
          Manage users and their roles for this tenant.
        </Paragraph>
      </div>
      <RestrictedAccess page={"Users"} hasAccess={permission.users.read}>
        <Suspense fallback={<SkeletonTable />}>
          <UsersTable
            users={users}
            isLoading={isLoading}
            headingTarget={portalTarget}
            rightSide={() => <InviteUserButton />}
          />
        </Suspense>

        <div className={"p-default py-6"}>
          <h2>Invites</h2>
          <Paragraph>
            Pending and past invites for this tenant.
          </Paragraph>
        </div>
        <Suspense fallback={<SkeletonTable />}>
          <UserInvitesTable invites={invites} isLoading={invitesLoading} />
        </Suspense>
      </RestrictedAccess>
    </PageContainer>
  );
}
