"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import { Callout } from "@components/Callout";
import Card from "@components/Card";
import { InstallClientButton } from "@components/ui/InstallClientButton";
import NoResults from "@components/ui/NoResults";
import { notify } from "@components/Notification";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import SkeletonTable from "@components/skeletons/SkeletonTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/Tabs";
import { usePortalElement } from "@hooks/usePortalElement";
import useRedirect from "@hooks/useRedirect";
import useFetchApi, { useApiCall } from "@utils/api";
import { generateColorFromString } from "@utils/helpers";
import dayjs from "dayjs";
import {
  Ban,
  Building2,
  CalendarDays,
  CircleDot,
  KeyRound,
  Laptop,
  LogInIcon,
  Mail,
  ShieldIcon,
  User2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { useSWRConfig } from "swr";
import ActivityIcon from "@/assets/icons/ActivityIcon";
import PeerIcon from "@/assets/icons/PeerIcon";
import TeamIcon from "@/assets/icons/TeamIcon";
import { usePermissions } from "@/contexts/PermissionsProvider";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import {
  BackendAuditEvent,
  transformAuditEvents,
} from "@/interfaces/ActivityEvent";
import { Device } from "@/interfaces/Device";
import { IdentityProvider } from "@/interfaces/IdentityProvider";
import { SDKKey } from "@/interfaces/SetupKey";
import ActivityTable from "@/modules/activity/ActivityTable";
import DevicesTable from "@/modules/devices/DevicesTable";
import PeersTable from "@/modules/peers/PeersTable";
import SetupKeysTable from "@/modules/setup-keys/SetupKeysTable";
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
  const userRequest = useApiCall<User>("/ui/users");
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

          <div className={"w-1/2 flex flex-col gap-4"}>
          {canEdit && (
            <Card className={"w-full"}>
              <Card.List>
                <Card.ListItem
                  tooltip={false}
                  label={
                    <span className={"flex items-center gap-2.5 whitespace-nowrap"}>
                      <ShieldIcon size={16} />
                      User Role
                    </span>
                  }
                  value={
                    <div className={"w-48"}>
                      <UserRoleSelector
                        value={role}
                        onChange={setRole}
                        hideOwner={false}
                        currentUser={user}
                        disabled={isLoggedInUser || !permission.users.update}
                      />
                    </div>
                  }
                />
              </Card.List>
            </Card>
          )}
          <UserTenantCard user={user} />
          </div>
        </div>
      </div>

      <UserTabs user={user} />
    </PageContainer>
  );
}

const TAB_TITLES: Record<string, string> = {
  peers: "Peers",
  tokens: "Access Tokens",
  devices: "Devices",
  activity: "Activity",
};

function UserPeersTable({
  headingTarget,
}: Readonly<{ headingTarget: HTMLHeadingElement | null }>) {
  const { peers, isLoading } = usePeers();
  return (
    <PeersTable
      isLoading={isLoading}
      peers={peers}
      headingTarget={headingTarget}
    />
  );
}

function UserTabs({ user }: Readonly<{ user: User }>) {
  const [tab, setTab] = useState("peers");
  const { permission } = usePermissions();
  const { loggedInUser } = useLoggedInUser();
  // Any role reads its own peers, keys, devices and activity; the control plane allows it for self-filtered lists
  const isSelf = user.id === loggedInUser?.id;
  const { data: userKeys, isLoading: keysLoading } = useFetchApi<SDKKey[]>(
    `/ui/sdk-keys?created_by=${user.id}`,
  );

  const { ref: headingRef, portalTarget } =
    usePortalElement<HTMLHeadingElement>();

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList justify={"start"} className={"px-8"}>
        <TabsTrigger value={"peers"} className={"focus-visible:outline-none"}>
          <PeerIcon size={16} />
          Peers
        </TabsTrigger>
        <TabsTrigger value={"tokens"} className={"focus-visible:outline-none"}>
          <KeyRound size={16} />
          Access Tokens
        </TabsTrigger>
        <TabsTrigger value={"devices"} className={"focus-visible:outline-none"}>
          <Laptop size={16} />
          Devices
        </TabsTrigger>
        <TabsTrigger value={"activity"} className={"focus-visible:outline-none"}>
          <ActivityIcon size={16} />
          Activity
        </TabsTrigger>
      </TabsList>

      <h2 ref={headingRef} className={"px-8 pt-6 pb-4"}>
        {TAB_TITLES[tab]}
      </h2>

      <TabsContent value={"peers"}>
        <Suspense fallback={<SkeletonTable />}>
          <PeersProvider userId={user.id}>
            <UserPeersTable headingTarget={portalTarget} />
          </PeersProvider>
        </Suspense>
      </TabsContent>

      <TabsContent value={"tokens"}>
        <RestrictedAccess
          page={"Access Tokens"}
          hasAccess={isSelf || permission.setup_keys.read}
        >
          <div className={"px-8 pb-6"}>
            <Callout variant={"info"} className={"max-w-3xl items-center"}>
              <div className={"flex items-center justify-between gap-6"}>
                <span>
                  Access tokens are SDK keys. They authenticate the Atla SDK and
                  the standalone <b>atla-client</b> binary installed on a
                  device, for example <code>atla-client --token atla_...</code>.
                  The key is shown only once when it is created.
                </span>
                <InstallClientButton />
              </div>
            </Callout>
          </div>
          <Suspense fallback={<SkeletonTable />}>
            <SetupKeysTable
              setupKeys={userKeys}
              isLoading={keysLoading}
              headingTarget={portalTarget}
            />
          </Suspense>
        </RestrictedAccess>
      </TabsContent>

      <TabsContent value={"devices"}>
        <RestrictedAccess page={"Devices"} hasAccess={isSelf || permission.devices.read}>
          <UserDevicesTable userId={user.id} headingTarget={portalTarget} />
        </RestrictedAccess>
      </TabsContent>

      <TabsContent value={"activity"}>
        <RestrictedAccess page={"Activity"} hasAccess={isSelf || permission.events.read}>
          <UserActivityTable user={user} headingTarget={portalTarget} />
        </RestrictedAccess>
      </TabsContent>
    </Tabs>
  );
}

function UserDevicesTable({
  userId,
  headingTarget,
}: Readonly<{ userId: string; headingTarget: HTMLHeadingElement | null }>) {
  const { data: devices, isLoading } = useFetchApi<Device[]>(
    `/ui/devices?user_id=${userId}`,
  );
  return (
    <Suspense fallback={<SkeletonTable />}>
      <DevicesTable
        devices={devices}
        isLoading={isLoading}
        headingTarget={headingTarget}
      />
    </Suspense>
  );
}

// Events the user initiated or that targeted them, newest first.
function UserActivityTable({
  user,
  headingTarget,
}: Readonly<{ user: User; headingTarget: HTMLHeadingElement | null }>) {
  const userId = user.id;
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: dayjs().subtract(14, "day").toDate(),
    to: dayjs().toDate(),
  });

  const eventsUrl = useMemo(() => {
    const params = new URLSearchParams({ user_id: userId });
    if (dateRange?.from)
      params.set("from", dayjs(dateRange.from).format("YYYY-MM-DD"));
    if (dateRange?.to)
      params.set("to", dayjs(dateRange.to).add(1, "day").format("YYYY-MM-DD"));
    return `/ui/events?${params.toString()}`;
  }, [userId, dateRange]);

  const {
    data: rawEvents,
    isLoading,
    mutate,
  } = useFetchApi<BackendAuditEvent[]>(eventsUrl);
  const events = useMemo(
    () => (rawEvents ? transformAuditEvents(rawEvents) : undefined),
    [rawEvents],
  );

  return (
    <Suspense fallback={<SkeletonTable />}>
      <ActivityTable
        events={events}
        isLoading={isLoading}
        headingTarget={headingTarget}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onRefresh={() => mutate()}
        initialUser={user.email || user.displayName || user.id}
        hideAllUsersOption={true}
        uniqueKey={`user-activity-${userId}`}
        getStartedCard={
          <NoResults
            className={"py-4"}
            title={"No activity in this period"}
            description={
              "Events initiated by this user, or targeting them, will appear here."
            }
            icon={<ActivityIcon size={20} className={"fill-nb-gray-300"} />}
          />
        }
      />
    </Suspense>
  );
}

// GET /ui/tenants returns only the caller's tenant, which is the one every listed user belongs to.
function UserTenantCard({ user }: Readonly<{ user: User }>) {
  const { data: tenants } = useFetchApi<{ id: string; name: string }[]>(
    "/ui/tenants",
  );
  const tenant = tenants?.find((t) => t.id === user.tenantId);

  return (
    <Card className={"w-full"}>
      <Card.List>
        <Card.ListItem
          tooltip={false}
          label={
            <span className={"flex items-center gap-2.5 whitespace-nowrap"}>
              <Building2 size={16} />
              Tenant
            </span>
          }
          value={
            // Same height as the role selector row so both cards line up.
            <div className={"h-[42px] flex items-center"}>
              {tenant?.name ?? user.tenantId}
            </div>
          }
        />
      </Card.List>
    </Card>
  );
}

// Local accounts have no identity provider; otherwise the user signed up through one.
function UserAuthSourceValue({ user }: Readonly<{ user: User }>) {
  const { permission } = usePermissions();
  const { data: providers } = useFetchApi<IdentityProvider[]>(
    "/ui/identity-providers",
    true,
    false,
    !!user.identityProviderId && permission.identity_providers.read,
  );

  if (!user.identityProviderId) return <>Local password</>;
  const provider = providers?.find((p) => p.id === user.identityProviderId);
  return <>{provider?.name ?? "External identity provider"}</>;
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
          label={<><CircleDot size={16} />Status</>}
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
          tooltip={false}
          label={<><LogInIcon size={16} />Sign-in method</>}
          value={<UserAuthSourceValue user={user} />}
        />

        <Card.ListItem
          label={<><CalendarDays size={16} />Member since</>}
          value={dayjs(user.createdAt).format("D MMMM, YYYY")}
        />
      </Card.List>
    </Card>
  );
}
