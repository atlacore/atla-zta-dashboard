import { AccessPolicy, PolicyRule } from "@/interfaces/AccessPolicy";
import { AtlaNetwork, AtlaNetworkRoute } from "@/interfaces/AtlaNetwork";
import { Resource } from "@/interfaces/Resource";
import { User } from "@/interfaces/User";
import { parseAtlaArn } from "@/modules/control-center/utils/arn";

export type ConnectionTarget =
  | { type: "resource"; resource: Resource }
  | {
      type: "network";
      network: AtlaNetwork;
      via?: Resource;
      routes: AtlaNetworkRoute[];
    };

// One concrete grant: a policy rule applied to a single user and a single target.
export type Connection = {
  id: string;
  ruleKey: string;
  policy: AccessPolicy;
  rule: PolicyRule;
  user: User;
  target: ConnectionTarget;
};

export function ruleLabel(rule: PolicyRule): string {
  return rule.protocol === "all"
    ? rule.action
    : `${rule.protocol}:${rule.ports.join(",")}`.toUpperCase();
}

export function buildConnections(
  policies: AccessPolicy[],
  users: User[],
  resources: Resource[],
  networks: AtlaNetwork[],
  routes: AtlaNetworkRoute[] = [],
): Connection[] {
  const routesByNetwork = new Map<string, AtlaNetworkRoute[]>();
  routes.forEach((route) =>
    routesByNetwork.set(route.networkId, [
      ...(routesByNetwork.get(route.networkId) ?? []),
      route,
    ]),
  );
  // Active routes first, then the lower metric (higher priority), then by CIDR for a stable order.
  routesByNetwork.forEach((list) =>
    list.sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        a.metric - b.metric ||
        a.cidr.localeCompare(b.cidr),
    ),
  );
  const usersById = new Map(users.map((user) => [user.id, user]));
  const resourcesById = new Map(
    resources.map((resource) => [resource.id, resource]),
  );
  const networksById = new Map(
    networks.map((network) => [network.id, network]),
  );
  const connections: Connection[] = [];

  policies.forEach((policy) => {
    (policy.rules ?? []).forEach((rule, ruleIndex) => {
      const ruleKey = `${policy.id}:${rule.id ?? ruleIndex}`;
      rule.users.forEach((userId) => {
        const user = usersById.get(userId);
        if (!user) return;
        rule.resources.forEach((arn) => {
          const parsed = parseAtlaArn(arn);
          if (!parsed) return;

          let target: ConnectionTarget | undefined;
          if (parsed.resourceType === "resource") {
            const resource = resourcesById.get(parsed.resourceId);
            if (resource) target = { type: "resource", resource };
          } else if (parsed.resourceType === "network") {
            const network = networksById.get(parsed.resourceId);
            if (network)
              target = {
                type: "network",
                network,
                via: resourcesById.get(network.resourceId),
                routes: routesByNetwork.get(network.id) ?? [],
              };
          }
          if (!target) return;

          const targetId =
            target.type === "resource" ? target.resource.id : target.network.id;
          connections.push({
            id: `${ruleKey}:${userId}:${targetId}`,
            ruleKey,
            policy,
            rule,
            user,
            target,
          });
        });
      });
    });
  });

  return connections;
}
