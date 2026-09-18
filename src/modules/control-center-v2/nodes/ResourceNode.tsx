import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import { Box, Database, Globe, Server } from "lucide-react";
import * as React from "react";
import { Resource, ResourceKind } from "@/interfaces/Resource";

const KIND_ICON: Record<ResourceKind, React.ReactNode> = {
  server: <Server size={14} />,
  db: <Database size={14} />,
  web: <Globe size={14} />,
  k8s: <Box size={14} />,
};

type ResourceNodeProps = Node<{ resource: Resource }, "resourceNode">;

export const ResourceNode = ({ data }: ResourceNodeProps) => {
  const { resource } = data;

  return (
    <div
      className={cn(
        "bg-nb-gray-940 border border-nb-gray-800 rounded-lg overflow-hidden",
        "flex items-center gap-3 pl-3 pr-5 py-3",
      )}
    >
      <div className={"h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"}>
        {KIND_ICON[resource.kind]}
      </div>
      <div>
        <div className={"text-nb-gray-200 text-sm whitespace-nowrap"}>{resource.name}</div>
        <div className={"text-nb-gray-400 text-xs whitespace-nowrap"}>
          {resource.hostname || resource.kind}
        </div>
      </div>

      <Handle type="source" position={Position.Right} id={"sr"} className={"opacity-0"} />
      <Handle type="target" position={Position.Left} id={"tl"} className={"opacity-0"} />
    </div>
  );
};
