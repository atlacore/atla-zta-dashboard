import Badge from "@components/Badge";
import { cn } from "@utils/helpers";
import { Handle, type Node, Position } from "@xyflow/react";
import { Cog, EyeIcon, ShieldIcon, User2 } from "lucide-react";
import * as React from "react";
import { Role, User } from "@/interfaces/User";

const ROLE_ICON: Record<Role, React.ReactNode> = {
  [Role.Owner]: <ShieldIcon size={12} />,
  [Role.Admin]: <Cog size={12} />,
  [Role.Auditor]: <EyeIcon size={12} />,
  [Role.Member]: <User2 size={12} />,
};

type UserNodeProps = Node<{ user: User }, "userNode">;

export const UserNode = ({ data }: UserNodeProps) => {
  const { user } = data;
  const label = user.displayName || user.email || user.extSub;

  return (
    <div
      className={cn(
        "bg-nb-gray-940 border border-nb-gray-800 rounded-lg overflow-hidden",
        "flex items-center gap-3 pl-3 pr-5 py-3",
      )}
    >
      <div className={"h-9 w-9 bg-nb-gray-850 rounded-md flex items-center justify-center shrink-0"}>
        <User2 size={14} />
      </div>
      <div>
        <div className={"text-nb-gray-200 text-sm whitespace-nowrap"}>{label}</div>
        <Badge variant={user.role === Role.Owner ? "netbird" : "gray"} size={"xs"}>
          {ROLE_ICON[user.role]}
          {user.role}
        </Badge>
      </div>

      <Handle type="source" position={Position.Right} id={"sr"} className={"opacity-0"} />
      <Handle type="target" position={Position.Left} id={"tl"} className={"opacity-0"} />
    </div>
  );
};
