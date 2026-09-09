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
  /** FQDN of the resource's auto-created DNS record, if one exists */
  hostname?: string;
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
  /** Zone for the auto-created DNS record; omit to auto-pick the tenant's one active zone */
  dnsZoneId?: string;
  /** Overrides the record name; default is the sanitized resource name */
  dnsLabel?: string;
}

export interface ResourceUpdateRequest {
  name?: string;
  region?: string;
  description?: string;
  credProfile?: ResourceCredProfile;
}
