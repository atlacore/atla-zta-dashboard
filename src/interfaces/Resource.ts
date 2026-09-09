export type ResourceKind = "server" | "db" | "web" | "k8s";

export type ResourceCredProfile = "none" | "ssh_cert" | "mtls_cert" | "db_creds";

export interface Resource {
  id: string;
  tenantId: string;
  name: string;
  kind: ResourceKind;
  credProfile: ResourceCredProfile;
  region: string;
  description?: string;
  createdAt: string;
}

export interface ResourceConfig {
  host?: string;
  port?: number;
}

export interface ResourceCreateRequest {
  name: string;
  kind: ResourceKind;
  credProfile: ResourceCredProfile;
  region: string;
  description?: string;
  config?: ResourceConfig;
}

export interface ResourceUpdateRequest {
  name?: string;
  region?: string;
  description?: string;
  credProfile?: ResourceCredProfile;
}
