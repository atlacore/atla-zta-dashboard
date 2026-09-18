"use client";

import "@xyflow/react/dist/style.css";
import Breadcrumbs from "@components/Breadcrumbs";
import { SmallBadge } from "@components/ui/SmallBadge";
import useFetchApi from "@utils/api";
import {
  Background,
  Edge,
  EdgeTypes,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import React, { useEffect } from "react";
import { AccessPolicy } from "@/interfaces/AccessPolicy";
import { AtlaNetwork } from "@/interfaces/AtlaNetwork";
import { Resource } from "@/interfaces/Resource";
import { User } from "@/interfaces/User";
import PageContainer from "@/layouts/PageContainer";
import {
  applyD3ForceLayout,
  DEFAULT_MAX_ZOOM,
  DEFAULT_MIN_ZOOM,
} from "@/modules/control-center/utils/layouts";
import { EDGE_TYPES } from "@/modules/control-center/utils/edges";
import { parseAtlaArn } from "@/modules/control-center-v2/utils/arn";
import { NODE_TYPES_V2 } from "@/modules/control-center-v2/utils/nodeTypes";

export default function ControlCenterV2() {
  return (
    <ReactFlowProvider>
      <ControlCenterV2View />
    </ReactFlowProvider>
  );
}

function ControlCenterV2View() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlow = useReactFlow();

  const { data: policies, isLoading: policiesLoading } =
    useFetchApi<AccessPolicy[]>("/ui/access-policies");
  const { data: users, isLoading: usersLoading } =
    useFetchApi<User[]>("/ui/users");
  const { data: resources, isLoading: resourcesLoading } =
    useFetchApi<Resource[]>("/ui/resources");
  const { data: networks, isLoading: networksLoading } =
    useFetchApi<AtlaNetwork[]>("/ui/networks");

  const isLoading =
    policiesLoading || usersLoading || resourcesLoading || networksLoading;

  useEffect(() => {
    if (isLoading || !policies || !users || !resources) return;

    const usersById = new Map(users.map((u) => [u.id, u]));
    const resourcesById = new Map(resources.map((r) => [r.id, r]));
    const networksById = new Map((networks || []).map((n) => [n.id, n]));

    const nodeIds = new Set<string>();
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

    policies.forEach((policy) => {
      (policy.rules || []).forEach((rule) => {
        const label =
          rule.protocol === "all"
            ? rule.action
            : `${rule.protocol}:${rule.ports.join(",")}`;

        rule.users.forEach((userId) => {
          const user = usersById.get(userId);
          if (!user) return;
          const userNodeId = ensureNode(`user-${userId}`, "userNode", { user });

          rule.resources.forEach((arn) => {
            const parsed = parseAtlaArn(arn);
            if (!parsed) return;

            let targetId: string | null = null;
            if (parsed.resourceType === "resource") {
              const resource = resourcesById.get(parsed.resourceId);
              if (resource) {
                targetId = ensureNode(`resource-${resource.id}`, "resourceNode", { resource });
              }
            } else if (parsed.resourceType === "network") {
              const network = networksById.get(parsed.resourceId);
              if (network) {
                targetId = ensureNode(`network-${network.id}`, "networkNode", { network });
              }
            }
            if (!targetId) return;

            const edgeId = `${userNodeId}-${targetId}-${policy.id}`;
            if (allEdges.some((e) => e.id === edgeId)) return;
            allEdges.push({
              id: edgeId,
              source: userNodeId,
              target: targetId,
              type: "floating-straight",
              data: { label },
            });
          });
        });
      });
    });

    const { updatedNodes, updatedEdges } = applyD3ForceLayout(allNodes, allEdges);
    setNodes(updatedNodes);
    setEdges(updatedEdges);

    window.requestAnimationFrame(() =>
      reactFlow.fitView({
        nodes: updatedNodes,
        padding: 0.1,
        duration: 500,
        maxZoom: 0.8,
        minZoom: DEFAULT_MIN_ZOOM,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, policies, users, resources, networks]);

  return (
    <PageContainer>
      <div style={{ width: "100%", height: "100%" }} className={"relative"}>
        <div className={"absolute left-0 top-0 z-10 px-6 py-4"}>
          <Breadcrumbs>
            <Breadcrumbs.Item href={"/control-center-v2"} label={"Topology"} active />
          </Breadcrumbs>
        </div>
        <div className={"absolute right-0 top-0 z-10 px-6 py-4"}>
          <SmallBadge
            text={"Preview"}
            variant={"sky"}
            className={"text-[12px] leading-none py-[3px] px-[6px]"}
            textClassName={"top-0"}
          />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          proOptions={{ hideAttribution: true }}
          nodeTypes={NODE_TYPES_V2 as unknown as NodeTypes}
          edgeTypes={EDGE_TYPES as unknown as EdgeTypes}
          fitView={false}
          maxZoom={DEFAULT_MAX_ZOOM}
          minZoom={DEFAULT_MIN_ZOOM}
          colorMode={"dark"}
        >
          <Background bgColor={"#181a1d"} gap={20} color={"#717171"} />
        </ReactFlow>
      </div>
    </PageContainer>
  );
}
