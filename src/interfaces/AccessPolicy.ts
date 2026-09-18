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
