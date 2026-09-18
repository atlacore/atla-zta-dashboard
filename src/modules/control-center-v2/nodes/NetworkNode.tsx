import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import { NetworkIcon } from "lucide-react";
import * as React from "react";
import { AtlaNetwork } from "@/interfaces/AtlaNetwork";

type NetworkNodeProps = Node<{ network: AtlaNetwork }, "networkNode">;

export const NetworkNode = ({ data }: NetworkNodeProps) => {
  const { network } = data;

  return (
    <div
      className={cn(
        "bg-nb-gray-940 border border-nb-gray-800 rounded-lg overflow-hidden",
        "flex items-center gap-3 pl-3 pr-5 py-3",
      )}
    >
      <div className={"h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"}>
        <NetworkIcon size={14} />
      </div>
      <div>
        <div className={"text-nb-gray-200 text-sm whitespace-nowrap"}>{network.name}</div>
        <div className={"text-nb-gray-400 text-xs whitespace-nowrap"}>{network.cidr}</div>
      </div>

      <Handle type="source" position={Position.Right} id={"sr"} className={"opacity-0"} />
      <Handle type="target" position={Position.Left} id={"tl"} className={"opacity-0"} />
    </div>
  );
};
