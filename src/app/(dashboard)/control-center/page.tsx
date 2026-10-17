"use client";

import "@xyflow/react/dist/style.css";
import Breadcrumbs from "@components/Breadcrumbs";
import CheckboxField from "@components/CheckboxField";
import { SmallBadge } from "@components/ui/SmallBadge";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import {
  Background,
  Controls,
  Edge,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { ListIcon, WorkflowIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { AccessPolicy } from "@/interfaces/AccessPolicy";
import { AtlaNetwork, AtlaNetworkRoute } from "@/interfaces/AtlaNetwork";
import { Resource } from "@/interfaces/Resource";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import ConnectionsTable from "@/modules/control-center/ConnectionsTable";
import {
  buildConnections,
  ruleLabel,
} from "@/modules/control-center/utils/connections";
import {
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
  layoutColumns,
} from "@/modules/control-center/utils/layout";
import { NODE_TYPES } from "@/modules/control-center/utils/nodeTypes";

type View = "graph" | "table";

export default function ControlCenterV2() {
  return (
    <ReactFlowProvider>
      <ControlCenterV2View />
    </ReactFlowProvider>
  );
}

// Edges reachable from a node going right (towards targets) and left (towards users).
function connectedEdgeIds(nodeId: string, edges: Edge[]): Set<string> {
  const found = new Set<string>();
  const walk = (start: string, forward: boolean) => {
    const queue = [start];
    while (queue.length) {
      const current = queue.pop() as string;
      edges.forEach((edge) => {
        const next = forward
          ? edge.source === current
            ? edge.target
            : null
          : edge.target === current
          ? edge.source
          : null;
        if (next === null || found.has(edge.id)) return;
        found.add(edge.id);
        queue.push(next);
      });
    }
  };
  walk(nodeId, true);
  walk(nodeId, false);
  return found;
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  const option = (value: View, label: string, icon: React.ReactNode) => (
    <button
      type={"button"}
      onClick={() => onChange(value)}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
        view === value
          ? "bg-nb-gray-800 text-nb-gray-50"
          : "text-nb-gray-400 hover:text-nb-gray-200",
      )}
    >
      {icon}
      {label}
    </button>
  );
  return (
    <div
      className={
        "flex items-center gap-1 rounded-lg border border-nb-gray-900 bg-nb-gray-930/70 p-1"
      }
    >
      {option("graph", "Graph", <WorkflowIcon size={13} />)}
      {option("table", "Table", <ListIcon size={13} />)}
    </div>
  );
}

function ControlCenterV2View() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [view, setView] = useState<View>("graph");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const reactFlow = useReactFlow();

  const { data: policies, isLoading: policiesLoading } = useFetchApi<
    AccessPolicy[]
  >("/ui/access-policies");
  const { data: users, isLoading: usersLoading } =
    useFetchApi<User[]>("/ui/users");
  const { data: resources, isLoading: resourcesLoading } =
    useFetchApi<Resource[]>("/ui/resources");
  const { data: networks, isLoading: networksLoading } =
    useFetchApi<AtlaNetwork[]>("/ui/networks");

  const { data: routes, isLoading: routesLoading } =
    useFetchApi<AtlaNetworkRoute[]>("/ui/routes");

  const isLoading =
    policiesLoading ||
    usersLoading ||
    resourcesLoading ||
    networksLoading ||
    routesLoading;

  const connections = useMemo(
    () =>
      policies && users && resources
        ? buildConnections(
            policies,
            users,
            resources,
            networks ?? [],
            routes ?? [],
          )
        : [],
    [policies, users, resources, networks, routes],
  );

  useEffect(() => {
    if (isLoading) return;

    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    const ensureNode = (
      id: string,
      type: string,
      data: Record<string, unknown>,
    ) => {
      if (nodeIds.has(id)) return id;
      nodeIds.add(id);
      allNodes.push({ id, type, data, position: { x: 0, y: 0 } });
      return id;
    };
    const ensureEdge = (source: string, target: string) => {
      const id = `${source}->${target}`;
      if (edgeIds.has(id)) return;
      edgeIds.add(id);
      allEdges.push({
        id,
        source,
        target,
        sourceHandle: "sr",
        targetHandle: "tl",
        type: "default",
      });
    };

    // user -> policy rule -> target: the rule node carries the policy name and protocol:ports.
    connections.forEach(({ ruleKey, policy, rule, user, target }) => {
      const userNode = ensureNode(`user-${user.id}`, "userNode", { user });
      const ruleNode = ensureNode(`rule-${ruleKey}`, "policyNode", {
        name: policy.name,
        label: ruleLabel(rule),
        action: rule.action,
      });
      const targetNode =
        target.type === "resource"
          ? ensureNode(`resource-${target.resource.id}`, "resourceNode", {
              resource: target.resource,
            })
          : ensureNode(`network-${target.network.id}`, "networkNode", {
              network: target.network,
            });
      ensureEdge(userNode, ruleNode);
      ensureEdge(ruleNode, targetNode);

      // network -> its routes, only for networks that are reachable through some policy.
      if (showRoutes && target.type === "network") {
        target.routes.forEach((route) =>
          ensureEdge(
            targetNode,
            ensureNode(`route-${route.id}`, "routeNode", { route }),
          ),
        );
      }
    });

    const updatedNodes = layoutColumns(allNodes, allEdges);
    setNodes(updatedNodes);
    setEdges(allEdges);

    window.requestAnimationFrame(() =>
      reactFlow.fitView({
        nodes: updatedNodes,
        padding: 0.15,
        duration: 500,
        maxZoom: 1,
        minZoom: DEFAULT_MIN_ZOOM,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, connections, showRoutes]);

  // Hovering a node highlights everything it is connected to and dims the rest.
  const displayedEdges = useMemo(() => {
    const active = hoveredId ? connectedEdgeIds(hoveredId, edges) : null;
    return edges.map((edge) => {
      const isActive = active?.has(edge.id) ?? false;
      const isDimmed = active !== null && !isActive;
      return {
        ...edge,
        zIndex: isActive ? 10 : 0,
        style: {
          stroke: isActive ? "#4ade80" : "#2dd4bf",
          strokeWidth: isActive ? 2 : 1.25,
          strokeDasharray: "5 5",
          strokeOpacity: isActive ? 1 : isDimmed ? 0.08 : 0.45,
        },
      };
    });
  }, [edges, hoveredId]);

  return (
    <PageContainer>
      <div
        style={{ width: "100%", height: "100%" }}
        className={"flex flex-col"}
      >
        <div className={"flex shrink-0 items-center justify-between px-6 py-4"}>
          <div className={"flex items-center gap-5"}>
            <Breadcrumbs>
              <Breadcrumbs.Item
                href={"/control-center"}
                label={"Topology"}
                active
              />
            </Breadcrumbs>
            <ViewToggle view={view} onChange={setView} />
            {view === "graph" && (
              <CheckboxField
                label={"Show routes"}
                checked={showRoutes}
                onChange={setShowRoutes}
              />
            )}
          </div>
          <SmallBadge
            text={"Preview"}
            variant={"sky"}
            className={"text-[12px] leading-none py-[3px] px-[6px]"}
            textClassName={"top-0"}
          />
        </div>

        <div className={"relative min-h-0 flex-1"}>
          {view === "graph" ? (
            <ReactFlow
              nodes={nodes}
              edges={displayedEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeMouseEnter={(_, node) => setHoveredId(node.id)}
              onNodeMouseLeave={() => setHoveredId(null)}
              proOptions={{ hideAttribution: true }}
              nodeTypes={NODE_TYPES as unknown as NodeTypes}
              fitView
              fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
              maxZoom={DEFAULT_MAX_ZOOM}
              minZoom={DEFAULT_MIN_ZOOM}
              colorMode={"dark"}
            >
              <Background bgColor={"#181a1d"} gap={20} color={"#717171"} />
              <Controls
                position={"bottom-right"}
                showInteractive={false}
                orientation={"horizontal"}
              />
            </ReactFlow>
          ) : (
            <div className={"h-full overflow-auto pt-2"}>
              <ConnectionsTable connections={connections} />
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
