"use client";

import Breadcrumbs from "@components/Breadcrumbs";
import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { notify } from "@components/Notification";
import Paragraph from "@components/Paragraph";
import FullScreenLoading from "@components/ui/FullScreenLoading";
import { PageNotFound } from "@components/ui/PageNotFound";
import { RestrictedAccess } from "@components/ui/RestrictedAccess";
import { SmallBadge } from "@components/ui/SmallBadge";
import useRedirect from "@hooks/useRedirect";
import useFetchApi, { useApiCall } from "@utils/api";
import dayjs from "dayjs";
import {
  CalendarDays,
  Globe,
  MapPin,
  NetworkIcon,
  ServerIcon,
  ShieldX,
  Wifi,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import React, { useMemo } from "react";
import PeerIcon from "@/assets/icons/PeerIcon";
import PeersProvider, { usePeers } from "@/contexts/PeersProvider";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { useUsers } from "@/contexts/UsersProvider";
import { PeerSession } from "@/interfaces/Peer";
import PageContainer from "@/layouts/PageContainer";
import PostureCacheCard from "@/modules/posture-cache/PostureCacheCard";

// Matches schemas.EdgeNode JSON output — only the fields shown here.
interface EdgeNodeSummary {
  id: string;
  edge_id: string;
  region: string;
  host: string;
}

const statusVariant = {
  active: "green",
  revoked: "yellow",
  expired: "yellow",
} as const;

export default function PeerPage() {
  const queryParameter = useSearchParams();
  const { isRestricted } = usePermissions();
  const sessionId = queryParameter.get("id");

  useRedirect("/peers", false, !sessionId || isRestricted);

  if (isRestricted) {
    return (
      <PageContainer>
        <RestrictedAccess page={"Session Information"} />
      </PageContainer>
    );
  }

  return (
    <PeersProvider>
      <PeerSessionDetail sessionId={sessionId} />
    </PeersProvider>
  );
}

function PeerSessionDetail({ sessionId }: Readonly<{ sessionId: string | null }>) {
  const { peers, isLoading, refresh } = usePeers();

  const session = useMemo(
    () => peers?.find((p) => p.id === sessionId),
    [peers, sessionId],
  );

  if (isLoading) return <FullScreenLoading />;

  if (!session) {
    return (
      <PageNotFound
        title={"Session not found"}
        description={
          "The session you are attempting to access cannot be found. It may have expired, been revoked, or you may not have permission to view it."
        }
      />
    );
  }

  return <PeerOverview session={session} refresh={refresh} />;
}

function PeerOverview({
  session,
  refresh,
}: Readonly<{ session: PeerSession; refresh: () => void }>) {
  return (
    <PageContainer>
      <div className={"p-default py-6"}>
        <Breadcrumbs>
          <Breadcrumbs.Item
            href={"/peers"}
            label={"Peers"}
            icon={<PeerIcon size={13} />}
          />
          <Breadcrumbs.Item label={session.allocatedIp} active />
        </Breadcrumbs>
        <PeerSessionHeader session={session} refresh={refresh} />
      </div>

      <div
        className={
          "px-8 flex-wrap xl:flex-nowrap flex gap-10 w-full items-start max-w-6xl"
        }
      >
        <SessionInformationCard session={session} />
        <div className={"flex flex-col gap-8 lg:w-1/2 transition-all"}>
          <PostureCacheCard deviceId={session.deviceId} />
          <AllowedIPsCard session={session} />
          <EdgeNodesCard session={session} />
        </div>
      </div>
    </PageContainer>
  );
}

function PeerSessionHeader({
  session,
  refresh,
}: Readonly<{ session: PeerSession; refresh: () => void }>) {
  const { permission } = usePermissions();
  const revokeRequest = useApiCall<{ status: string }>(
    "/ui/peers/" + session.id,
  );

  const revoke = () => {
    const promise = revokeRequest.del().then(() => refresh());
    notify({
      title: "Revoke Session",
      description: "Session successfully revoked.",
      promise,
      loadingMessage: "Revoking session...",
    });
  };

  return (
    <div className={"flex justify-between max-w-6xl items-start"}>
      <div>
        <div className={"flex items-center gap-3"}>
          <h1 className={"flex items-center gap-3"}>
            <Wifi size={20} className={"shrink-0"} />
            {session.allocatedIp}
          </h1>
          <SmallBadge
            text={session.status}
            variant={statusVariant[session.status]}
            size={"md"}
          />
        </div>
        <Paragraph className={"mt-1"}>
          Device-scoped {session.transport} session for this peer.
        </Paragraph>
      </div>
      {permission.peers?.delete && session.status === "active" && (
        <Button variant={"danger-outline"} onClick={revoke}>
          <ShieldX size={14} />
          Revoke Session
        </Button>
      )}
    </div>
  );
}

function SessionInformationCard({
  session,
}: Readonly<{ session: PeerSession }>) {
  const { users } = useUsers();

  const user = useMemo(
    () => users?.find((u) => u.id === session.userId),
    [users, session.userId],
  );

  return (
    <Card className={"w-full xl:w-1/2"}>
      <Card.List>
        <Card.ListItem
          copy
          tooltip={false}
          copyText={"Allocated IP"}
          label={
            <>
              <MapPin size={16} />
              Allocated IP
            </>
          }
          valueToCopy={session.allocatedIp}
          value={session.allocatedIp}
        />
        <Card.ListItem
          copy
          copyText={"Client IP"}
          label={
            <>
              <NetworkIcon size={16} />
              Client IP
            </>
          }
          valueToCopy={session.clientIp}
          value={session.clientIp}
        />
        <Card.ListItem
          label={
            <>
              <Globe size={16} />
              User
            </>
          }
          value={user?.displayName || user?.email || session.userId}
        />
        <Card.ListItem
          label={
            <>
              <ServerIcon size={16} />
              Region
            </>
          }
          value={session.region || "—"}
        />
        <Card.ListItem
          label={
            <>
              <ServerIcon size={16} />
              Transport
            </>
          }
          value={session.transport}
        />
        {session.deviceId && (
          <Card.ListItem
            copy
            copyText={"Device ID"}
            label={
              <>
                <ServerIcon size={16} />
                Device ID
              </>
            }
            valueToCopy={session.deviceId}
            value={session.deviceId}
          />
        )}
        <Card.ListItem
          label={
            <>
              <CalendarDays size={16} />
              Created
            </>
          }
          value={dayjs(session.createdAt).format("D MMMM, YYYY [at] h:mm A")}
        />
        <Card.ListItem
          label={
            <>
              <CalendarDays size={16} />
              Expires
            </>
          }
          value={dayjs(session.expiresAt).format("D MMMM, YYYY [at] h:mm A")}
        />
        {session.revokedAt && (
          <Card.ListItem
            label={
              <>
                <CalendarDays size={16} />
                Revoked
              </>
            }
            value={dayjs(session.revokedAt).format("D MMMM, YYYY [at] h:mm A")}
          />
        )}
      </Card.List>
    </Card>
  );
}

function AllowedIPsCard({ session }: Readonly<{ session: PeerSession }>) {
  return (
    <div>
      <Label>Allowed IPs</Label>
      <HelpText>
        CIDRs granted to this session, accreted from every access-policy
        connect grant.
      </HelpText>
      <Card>
        {session.allowedIps?.length ? (
          <ul className={"flex flex-col divide-y dark:divide-nb-gray-900"}>
            {session.allowedIps.map((cidr) => (
              <li
                key={cidr}
                className={"px-4 py-2.5 font-mono text-sm text-nb-gray-300"}
              >
                {cidr}
              </li>
            ))}
          </ul>
        ) : (
          <div className={"px-4 py-3 text-sm text-nb-gray-400"}>
            No routes granted yet.
          </div>
        )}
      </Card>
    </div>
  );
}

function EdgeNodesCard({ session }: Readonly<{ session: PeerSession }>) {
  const { data: edges } = useFetchApi<EdgeNodeSummary[]>("/ui/edges");

  const pinnedEdges = useMemo(
    () => edges?.filter((e) => session.edgeNodeIds?.includes(e.id)) ?? [],
    [edges, session.edgeNodeIds],
  );

  if (!session.edgeNodeIds?.length) return null;

  return (
    <div>
      <Label>Edge Nodes</Label>
      <HelpText>Edges this session is pinned to.</HelpText>
      <Card>
        <ul className={"flex flex-col divide-y dark:divide-nb-gray-900"}>
          {pinnedEdges.map((edge) => (
            <li
              key={edge.id}
              className={"px-4 py-2.5 flex items-center gap-2 text-sm"}
            >
              <ServerIcon size={14} className={"text-nb-gray-400 shrink-0"} />
              <span>{edge.host || edge.edge_id}</span>
              <span className={"text-nb-gray-400"}>({edge.region})</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
