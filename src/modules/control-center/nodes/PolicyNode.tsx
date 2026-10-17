import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import * as React from "react";
import { PolicyAction } from "@/interfaces/AccessPolicy";

type PolicyNodeProps = Node<
  { name: string; label: string; action: PolicyAction },
  "policyNode"
>;

export const PolicyNode = ({ data }: PolicyNodeProps) => (
  <div
    className={cn(
      "bg-nb-gray-940 border border-nb-gray-800 rounded-full overflow-hidden",
      "flex items-center text-sm",
    )}
  >
    <div className={"flex items-center gap-2.5 pl-4 pr-4 py-2.5"}>
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          data.action === "allow" ? "bg-green-500" : "bg-red-500",
        )}
      />
      <span className={"text-nb-gray-100 whitespace-nowrap"}>{data.name}</span>
    </div>
    <div
      className={
        "border-l border-nb-gray-800 pl-3 pr-4 py-2.5 font-mono text-xs text-nb-gray-300 whitespace-nowrap"
      }
    >
      {data.label}
    </div>

    <Handle
      type="source"
      position={Position.Right}
      id={"sr"}
      className={"opacity-0"}
    />
    <Handle
      type="target"
      position={Position.Left}
      id={"tl"}
      className={"opacity-0"}
    />
  </div>
);
