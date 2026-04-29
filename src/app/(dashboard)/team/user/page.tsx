"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Separator from "@components/Separator";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import useRedirect from "@hooks/useRedirect";
import { useApiCall } from "@utils/api";
import { generateColorFromString } from "@utils/helpers";
import dayjs from "dayjs";
import { Ban, Mail, User2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useLoggedInUser, useUsers } from "@/contexts/UsersProvider";
import { useHasChanges } from "@/hooks/useHasChanges";
import { Role, User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import UserBlockCell from "@/modules/users/table-cells/UserBlockCell";
import UserStatusCell from "@/modules/users/table-cells/UserStatusCell";
import { UserRoleSelector } from "@/modules/users/UserRoleSelector";

export default function UserPage() {
  const queryParameter = useSearchParams();
  const userId = queryParameter.get("id");
  const { permission } = usePermissions();
  const { users, isLoading } = useUsers();
  const { loggedInUser, isOwnerOrAdmin } = useLoggedInUser();

  const isSelf = userId === loggedInUser?.id;

  const user = useMemo(() => {
    // Self-profile: use loggedInUser directly, no list fetch needed
    if (isSelf) return loggedInUser;
    return users?.find((u) => u.id === userId);
  }, [isSelf, loggedInUser, users, userId]);

  useRedirect("/team/users", false, !userId);

  // Members can always view their own profile; others need users.read
  if (!isSelf && !permission.users.read) {
    return (
      <PageContainer>
        <RestrictedAccess page={"User Information"} />
      </PageContainer>
    );
  }

  if (user) {
    return <UserOverview user={user} canEdit={isOwnerOrAdmin} />;
  }

  if (isLoading) return <FullScreenLoading />;

  return <FullScreenLoading />;
}

type Props = {
  user: User;
  canEdit: boolean;
};

function UserOverview({ user, canEdit }: Readonly<Props>) {
  const router = useRouter();
  const userRequest = useApiCall<User>("/ui/user");
  const { mutate } = useSWRConfig();
  const { loggedInUser } = useLoggedInUser();
  const { permission } = usePermissions();
  const isLoggedInUser = loggedInUser?.id === user.id;

  const [role, setRole] = useState<Role>(user.role);
  const { hasChanges, updateRef } = useHasChanges([role]);

  const save = async () => {
    notify({
      title: user.displayName || user.email || user.id,
      description: "Changes successfully saved.",
      promise: userRequest
        .patch({ role }, `/${user.id}`)
        .then(() => {
          mutate("/ui/users");
          updateRef([role]);
        }),
      loadingMessage: "Saving changes...",
    });
  };

  return (
    <PageContainer>
      <div className={"p-default py-6 mb-4"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/team"}
            label={"Team"}
            disabled={!permission.users.read}
            icon={<TeamIcon size={13} />}
          />
          <Breadcrumbs.Item
            href={"/team/users"}
            label={"Users"}
            disabled={!permission.users.read}
            icon={<User2 size={16} />}
          />
          <Breadcrumbs.Item
            label={user.displayName || user.email || user.id}
            active
          />
        </Breadcrumbs>

        <div className={"flex justify-between max-w-6xl"}>
          <div>
            <div className={"flex items-center gap-3"}>
              <div
                className={
                  "w-10 h-10 rounded-full flex items-center justify-center text-white uppercase text-md font-medium bg-nb-gray-900"
                }
                style={{
                  color: generateColorFromString(
                    user.displayName || user.email || user.id,
                  ),
                }}
              >
                {(user.displayName || user.email || user.id).charAt(0)}
              </div>
              <h1 title={user.id}>
                {user.displayName || user.email || user.id}
              </h1>
            </div>
          </div>

          {canEdit && (
            <div className={"flex gap-4"}>
              <Button
                variant={"default"}
                onClick={() => router.push("/team/users")}
              >
                Cancel
              </Button>
              <Button
                variant={"primary"}
                disabled={!hasChanges || !permission.users.update}
                onClick={save}
                data-cy={"save-changes"}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <div className={"flex gap-10 w-full mt-8 max-w-6xl items-start"}>
          <UserInformationCard user={user} />

          {canEdit && (
            <div className={"flex flex-col gap-8 w-1/2"}>
              <div className={"flex items-start"}>
                <div className={"w-2/3"}>
                  <Label>User Role</Label>
                </div>
                <div className={"w-1/3"}>
                  <UserRoleSelector
                    value={role}
                    onChange={setRole}
                    hideOwner={false}
                    currentUser={user}
                    disabled={isLoggedInUser || !permission.users.update}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />
    </PageContainer>
  );
}

function UserInformationCard({ user }: Readonly<{ user: User }>) {
  return (
    <Card>
      <Card.List>
        <Card.ListItem
          label={<><User2 size={16} />Name</>}
          value={user.displayName || user.email || user.id}
        />

        <Card.ListItem
          label={<><Mail size={16} />Email</>}
          value={user.email || "—"}
        />

        <Card.ListItem
          tooltip={false}
          label={<>Status</>}
          value={<UserStatusCell user={user} />}
        />

        {user.role !== Role.Owner && (
          <Card.ListItem
            tooltip={false}
            label={<><Ban size={16} />Block User</>}
            value={<UserBlockCell user={user} isUserPage={true} />}
          />
        )}

        <Card.ListItem
          label={<>Member since</>}
          value={dayjs(user.createdAt).format("D MMMM, YYYY")}
        />
      </Card.List>
    </Card>
  );
}
