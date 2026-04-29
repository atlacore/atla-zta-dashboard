export type PolicyAction = "allow" | "deny";
export type PolicyProtocol = "all" | "tcp" | "udp" | "icmp";

export interface PolicyRule {
  id?: string;
  policyId?: string;
  resources: string[];  // user IDs (note: backend field name mismatch — see GoDoc)
  subjects: string[];   // resource ARNs
  action: PolicyAction;
  protocol: PolicyProtocol;
  ports: number[];
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
}

export interface AccessPolicyCreateRequest {
  name: string;
  rules: PolicyRuleRequest[];
}

export interface AccessPolicyUpdateRequest {
  name?: string;
  description?: string;
}
