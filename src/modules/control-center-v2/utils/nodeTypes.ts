import { NetworkNode } from "@/modules/control-center-v2/nodes/NetworkNode";
import { ResourceNode } from "@/modules/control-center-v2/nodes/ResourceNode";
import { UserNode } from "@/modules/control-center-v2/nodes/UserNode";

export const NODE_TYPES_V2 = {
  userNode: UserNode,
  resourceNode: ResourceNode,
  networkNode: NetworkNode,
};
