"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Paragraph from "@components/Paragraph";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { usePortalElement } from "@hooks/usePortalElement";
import useFetchApi from "@utils/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { MailPlus, User2 } from "lucide-react";
import React, { lazy, Suspense, useState } from "react";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Invite } from "@/interfaces/Invite";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import UserInvitesTable, {
  InviteUserButton,
} from "@/modules/users/UserInvitesTable";

const UsersTable = lazy(() => import("@/modules/users/UsersTable"));

function TabCount({ value }: Readonly<{ value?: number }>) {
  if (value === undefined) return null;
  return (
    <span
      className={
        "rounded-full bg-nb-gray-900 px-2 py-0.5 text-xs leading-none text-nb-gray-300"
      }
    >
      {value}
    </span>
  );
}

export default function TeamUsers() {
  const [tab, setTab] = useState("users");
  const { permission } = usePermissions();
  const { data: users, isLoading } = useFetchApi<User[]>("/ui/users");
  const { data: invites, isLoading: invitesLoading } =
    useFetchApi<Invite[]>("/ui/users/invites");

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
        <Paragraph>Manage users and their roles for this tenant.</Paragraph>
      </div>
      <RestrictedAccess page={"Users"} hasAccess={permission.users.read}>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList justify={"start"} className={"p-default"}>
            <TabsTrigger value={"users"}>
              <User2 size={16} />
              Users
              <TabCount value={users?.length} />
            </TabsTrigger>
            <TabsTrigger value={"invites"}>
              <MailPlus size={16} />
              Invites
              <TabCount value={invites?.length} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value={"users"} className={"pt-6"}>
            <Suspense fallback={<SkeletonTable />}>
              <UsersTable
                users={users}
                isLoading={isLoading}
                headingTarget={portalTarget}
                rightSide={() => <InviteUserButton />}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value={"invites"} className={"pt-6"}>
            <Suspense fallback={<SkeletonTable />}>
              <UserInvitesTable
                invites={invites}
                isLoading={invitesLoading}
                headingTarget={portalTarget}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </RestrictedAccess>
    </PageContainer>
  );
}
