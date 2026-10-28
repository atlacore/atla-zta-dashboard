export type PolicyAction = "allow" | "deny";
export type PolicyProtocol = "all" | "tcp" | "udp" | "icmp";

export interface PolicyRule {
  id?: string;
  policyId?: string;
  users: string[];       // user UUIDs
  resources: string[];   // resource/network ARNs
  action: PolicyAction;
  protocol: PolicyProtocol;
  ports: number[];
  postureCheckIds?: string[];
  createdAt?: string;
}

export interface PolicyRuleRequest {
  users: string[];       // user UUIDs
  resources: string[];   // resource ARNs
  action: PolicyAction;
  protocol: PolicyProtocol;
  ports: number[];
}

export interface AccessPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Present on GET/LIST responses, absent on the create/update echo
  rules?: PolicyRule[];
}

export interface AccessPolicyCreateRequest {
  name: string;
  rules: PolicyRuleRequest[];
}

export interface AccessPolicyUpdateRequest {
  name?: string;
  description?: string;
}

/** POST /ui/access-policies/simulate: a draft is policies to add plus stored policy ids to remove. */
export interface AccessPolicySimulationRequest {
  add?: AccessPolicyCreateRequest[];
  remove?: string[];
}

export type SimulationChange = "gained" | "lost" | "traffic_changed";

export interface TrafficFilter {
  protocol: PolicyProtocol;
  /** Empty means every port of the protocol. */
  ports?: number[];
}

export interface SimulationVerdict {
  granted: boolean;
  denied: boolean;
  /** Absent while granted means all traffic. */
  traffic?: TrafficFilter[];
}

interface SimulationRow {
  userId: string;
  arn: string;
  change: SimulationChange;
  before: SimulationVerdict;
  after: SimulationVerdict;
  /** A rule for this ARN has posture checks; the simulation has no client-claimed posture. */
  postureDependent?: boolean;
}

export interface SimulationSessionChange extends SimulationRow {
  sessionId: string;
  deviceId: string;
}

export type SimulationAccessChange = SimulationRow;

export interface AccessPolicySimulationResponse {
  sessions: SimulationSessionChange[];
  access: SimulationAccessChange[];
  evaluatedGrants: number;
  evaluatedPairs: number;
  truncated: boolean;
  warnings?: string[];
}
