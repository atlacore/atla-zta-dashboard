export type ResourceKind = "wg" | "ssh" | "db" | "mtls";

export interface Resource {
  id: string;
  tenantId: string;
  name: string;
  kind: ResourceKind;
  region: string;
  description?: string;
  arn: string;
  createdAt: string;
}

export interface ResourceCreateRequest {
  name: string;
  kind: ResourceKind;
  region: string;
  description?: string;
  config: Record<string, unknown>;
}

export interface ResourceUpdateRequest {
  name?: string;
  region?: string;
  description?: string;
}
