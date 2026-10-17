import { NetworkNode } from "@/modules/control-center/nodes/NetworkNode";
import { PolicyNode } from "@/modules/control-center/nodes/PolicyNode";
import { ResourceNode } from "@/modules/control-center/nodes/ResourceNode";
import { RouteNode } from "@/modules/control-center/nodes/RouteNode";
import { UserNode } from "@/modules/control-center/nodes/UserNode";

export const NODE_TYPES = {
  userNode: UserNode,
  policyNode: PolicyNode,
  resourceNode: ResourceNode,
  networkNode: NetworkNode,
  routeNode: RouteNode,
};
