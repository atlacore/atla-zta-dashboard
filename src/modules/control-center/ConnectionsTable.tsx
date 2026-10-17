"use client";

import { Input } from "@components/Input";
import { cn } from "@utils/helpers";
import {
  ArrowRight,
  Box,
  CalendarDays,
  CheckCircle2,
  Database,
  Gauge,
  Globe,
  KeyRound,
  Link2,
  MapPin,
  NetworkIcon,
  RouteIcon,
  Router,
  SearchIcon,
  Server,
  User2,
  XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { AtlaNetworkRoute } from "@/interfaces/AtlaNetwork";
import { ResourceKind } from "@/interfaces/Resource";
import { Connection } from "@/modules/control-center/utils/connections";

const KIND_ICON: Record<ResourceKind, React.ReactNode> = {
  server: <Server size={14} />,
  db: <Database size={14} />,
  web: <Globe size={14} />,
  k8s: <Box size={14} />,
};

// One template for the header and every row, so the columns line up regardless of row content.
const ROW_GRID =
  "grid grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1.7fr)_170px] gap-x-6 items-center";

function Pill({
  children,
  mono = true,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-md border border-nb-gray-800 bg-nb-gray-900/60 px-2.5 py-1 text-xs text-nb-gray-200 whitespace-nowrap",
        mono && "font-mono",
      )}
    >
      {children}
    </span>
  );
}

type Tone = "sky" | "violet" | "amber" | "green" | "gray";
type ChipSpec = {
  text: string;
  tone: Tone;
  icon?: React.ReactNode;
  mono?: boolean;
};

const TONES: Record<Tone, string> = {
  sky: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  gray: "bg-nb-gray-900/70 text-nb-gray-400 border-nb-gray-800",
};

function Chip({
  tone,
  icon,
  mono = false,
  children,
}: {
  tone: Tone;
  icon?: React.ReactNode;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs whitespace-nowrap",
        TONES[tone],
        mono && "font-mono",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function RouteRow({ route }: { route: AtlaNetworkRoute }) {
  return (
    <div
      className={cn(
        // Fixed columns line up across rows; the description takes the free space, status and date sit at the end.
        "grid min-w-[34rem] grid-cols-[1.5rem_7.25rem_0.75rem_7rem_6.25rem_minmax(0,1fr)_auto] items-center gap-2 [&>*]:justify-self-start",
        !route.isActive && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          route.isActive
            ? "bg-green-500/10 text-green-400"
            : "bg-nb-gray-900 text-nb-gray-500",
        )}
        title={route.isActive ? "Active route" : "Inactive route"}
      >
        <RouteIcon size={13} />
      </span>
      <Chip tone={"sky"} mono>
        {route.cidr}
      </Chip>
      <ArrowRight size={12} className={"text-nb-gray-500"} />
      {route.via ? (
        <Chip tone={"violet"} mono icon={<Router size={11} />}>
          {route.via}
        </Chip>
      ) : (
        <Chip tone={"gray"} icon={<Link2 size={11} />}>
          connected
        </Chip>
      )}
      <Chip tone={"amber"} icon={<Gauge size={11} />}>
        metric {route.metric}
      </Chip>
      <span
        className={cn(
          "min-w-0 max-w-full truncate text-xs",
          route.description ? "text-nb-gray-300" : "text-nb-gray-600",
        )}
        title={route.description ?? undefined}
      >
        {route.description || "No description"}
      </span>
      <span
        className={"justify-self-end"}
        title={`${route.isActive ? "Active" : "Inactive"} · created ${new Date(
          route.createdAt,
        ).toLocaleString()}`}
      >
        <Chip tone={"gray"} icon={<CalendarDays size={11} />}>
          {new Date(route.createdAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Chip>
      </span>
    </div>
  );
}

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={
        "h-9 w-9 shrink-0 rounded-md bg-nb-gray-850 flex items-center justify-center text-nb-gray-300"
      }
    >
      {children}
    </div>
  );
}

function describeTarget(connection: Connection) {
  const { target } = connection;
  if (target.type === "resource") {
    const { resource } = target;
    return {
      icon: KIND_ICON[resource.kind],
      noun: `${resource.kind} resource`,
      name: resource.name,
      detail: resource.hostname || resource.description || "",
      meta: [resource.region, `creds: ${resource.credProfile}`],
      chips: [
        { text: resource.region, tone: "sky", icon: <MapPin size={11} /> },
        {
          text: resource.credProfile,
          tone: "violet",
          icon: <KeyRound size={11} />,
        },
      ] as ChipSpec[],
      routes: [] as AtlaNetworkRoute[],
    };
  }
  const { network, via } = target;
  return {
    icon: <NetworkIcon size={14} />,
    noun: "network",
    name: network.name,
    detail: network.cidr,
    meta: [
      via ? `via ${via.name}` : "",
      network.isActive ? "active" : "inactive",
    ].filter(Boolean),
    chips: [
      {
        text: network.cidr,
        tone: "sky",
        mono: true,
        icon: <NetworkIcon size={11} />,
      },
      ...(via
        ? [{ text: via.name, tone: "violet", icon: <Link2 size={11} /> }]
        : []),
      {
        text: network.isActive ? "active" : "inactive",
        tone: network.isActive ? "green" : "gray",
        icon: network.isActive ? (
          <CheckCircle2 size={11} />
        ) : (
          <XCircle size={11} />
        ),
      },
    ] as ChipSpec[],
    routes: target.routes,
  };
}

function searchText(connection: Connection): string {
  const target = describeTarget(connection);
  const { user, policy, rule } = connection;
  return [
    user.displayName,
    user.email,
    user.extSub,
    policy.name,
    rule.action,
    rule.protocol,
    rule.ports.join(" "),
    target.name,
    target.detail,
    ...target.meta,
    ...target.routes.flatMap((route) => [route.cidr, route.via]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function ConnectionsTable({
  connections,
}: {
  connections: Connection[];
}) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? connections.filter((connection) =>
          searchText(connection).includes(needle),
        )
      : connections;
  }, [connections, query]);

  return (
    <div className={"px-6 pb-10"}>
      <div className={"flex items-center justify-between gap-4 pb-4"}>
        <div className={"text-sm text-nb-gray-400"}>
          {rows.length} of {connections.length} connections
        </div>
        <div className={"w-full max-w-[360px]"}>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={"Search user, policy, target, port…"}
            customPrefix={<SearchIcon size={14} />}
          />
        </div>
      </div>

      <div
        className={cn(
          ROW_GRID,
          "border-b border-nb-gray-900 pb-3 text-xs uppercase tracking-wide text-nb-gray-500",
        )}
      >
        <div className={"pl-5"}>Access</div>
        <div>User</div>
        <div>Target</div>
        <div className={"text-right"}>Protocol / ports</div>
      </div>

      <div>
        {rows.length === 0 && (
          <div className={"py-10 text-sm text-nb-gray-400"}>
            No connections match.
          </div>
        )}
        {rows.map((connection) => {
          const { user, policy, rule } = connection;
          const target = describeTarget(connection);
          const allowed = rule.action === "allow";
          const userName = user.displayName || user.email || user.extSub;

          return (
            <div
              key={connection.id}
              className={cn(ROW_GRID, "border-b border-nb-gray-900 py-4")}
            >
              <div className={"flex gap-3 min-w-0"}>
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    allowed ? "bg-green-500" : "bg-red-500",
                  )}
                />
                <div className={"min-w-0"}>
                  <div className={"text-sm text-nb-gray-100"}>
                    {allowed ? "Access granted" : "Access blocked"}
                    <span className={"text-nb-gray-400"}> · {target.noun}</span>
                  </div>
                  <div className={"mt-1 text-xs text-nb-gray-400"}>
                    {allowed ? "Granted" : "Blocked"} by policy{" "}
                    <span className={"font-medium text-nb-gray-200"}>
                      {policy.name}
                    </span>
                  </div>
                  <div className={"mt-0.5 text-xs text-nb-gray-500"}>
                    Policy created {new Date(policy.createdAt).toLocaleString()}
                    {rule.postureCheckIds && rule.postureCheckIds.length > 0
                      ? ` · ${rule.postureCheckIds.length} posture check(s)`
                      : ""}
                  </div>
                </div>
              </div>

              <div className={"flex items-center gap-3 min-w-0"}>
                <IconBox>
                  <User2 size={14} />
                </IconBox>
                <div className={"min-w-0"}>
                  <div className={"text-sm text-nb-gray-100 truncate"}>
                    {userName}
                  </div>
                  <div className={"text-xs text-nb-gray-400 truncate"}>
                    {user.email || user.extSub} · {user.role}
                  </div>
                </div>
              </div>

              <div className={"flex items-center gap-3 min-w-0"}>
                <IconBox>{target.icon}</IconBox>
                <div className={"min-w-0 flex-1"}>
                  <div className={"text-sm text-nb-gray-100 truncate"}>
                    {target.name}
                  </div>
                  {target.routes.length === 0 && target.detail && (
                    <div
                      className={"font-mono text-xs text-nb-gray-400 truncate"}
                    >
                      {target.detail}
                    </div>
                  )}
                  <div className={"mt-1.5 flex flex-wrap items-center gap-1.5"}>
                    {target.chips.map((chip) => (
                      <Chip
                        key={chip.text}
                        tone={chip.tone}
                        mono={chip.mono}
                        icon={chip.icon}
                      >
                        {chip.text}
                      </Chip>
                    ))}
                  </div>
                  {target.routes.length > 0 && (
                    <div
                      className={
                        "mt-3 flex flex-col gap-2 overflow-x-auto rounded-lg border border-nb-gray-800/70 bg-nb-gray-930/40 p-3"
                      }
                    >
                      <div
                        className={
                          "flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-nb-gray-500"
                        }
                      >
                        <RouteIcon size={11} />
                        Routes · {target.routes.length}
                      </div>
                      {target.routes.map((route) => (
                        <RouteRow key={route.id} route={route} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={"flex flex-wrap items-center justify-end gap-2"}>
                <Pill>
                  {rule.protocol === "all"
                    ? "ALL"
                    : rule.protocol.toUpperCase()}
                </Pill>
                {rule.ports.length === 0 ? (
                  <Pill>any port</Pill>
                ) : (
                  rule.ports.map((port) => <Pill key={port}>{port}</Pill>)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
