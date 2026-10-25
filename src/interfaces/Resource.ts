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

export type DatabasePlugin = "postgres" | "mysql";

export type DatabasePrivileges = "readonly" | "readwrite";

export type DatabaseSSLMode = "disable" | "require" | "verify-full";

/** Admin account Vault uses to create a user per session of a db_creds resource */
export interface ResourceDatabaseConfig {
  plugin: DatabasePlugin;
  database: string;
  username: string;
  password: string;
  privileges: DatabasePrivileges;
  /** Postgres only, default "require" */
  ssl_mode?: DatabaseSSLMode;
}

export interface ResourceConfig {
  host?: string;
  port?: number;
  /** ssh_cert: the logins every granted user may use on the server */
  ssh_principals?: string[];
  /** db_creds: required */
  db?: ResourceDatabaseConfig;
}

/** What the tenant's servers trust: its SSH user CA and its client certificate CA */
export interface CredentialCAs {
  sshCaPublicKey: string;
  clientCaPem: string;
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
