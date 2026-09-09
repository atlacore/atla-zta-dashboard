import { Group } from "@/interfaces/Group";
import { User } from "@/interfaces/User";

/** Legacy peer interface — kept for backward compatibility with NetBird modules */
export interface Peer {
  id?: string;
  name: string;
  ip: string;
  connected: boolean;
  created_at?: Date;
  last_seen: Date;
  os: string;
  version: string;
  groups?: Group[];
  ssh_enabled: boolean;
  hostname: string;
  user_id?: string;
  user?: User;
  ui_version?: string;
  kernel_version?: string;
  dns_label: string;
  extra_dns_labels?: string[];
  last_login: Date;
  login_expired: boolean;
  login_expiration_enabled: boolean;
  inactivity_expiration_enabled: boolean;
  approval_required: boolean;
  disapproval_reason?: string;
  city_name: string;
  country_code: string;
  connection_ip: string;
  serial_number: string;
  ephemeral: boolean;
  local_flags?: PeerLocalFlags;
}

export interface PeerLocalFlags {
  block_inbound: boolean;
  block_lan_access: boolean;
  disable_client_routes: boolean;
  disable_dns: boolean;
  disable_firewall: boolean;
  disable_server_routes: boolean;
  lazy_connection_enabled: boolean;
  rosenpass_enabled: boolean;
  rosenpass_permissive: boolean;
  server_ssh_allowed: boolean;
}

/** Atla-ZTA peer session — returned from GET /ui/peers. Matches schemas.PeerSession. */
export interface PeerSession {
  id: string;
  tenantId: string;
  userId: string;
  edgeNodeIds: string[];
  region: string;
  allocatedIp: string;
  allowedIps: string[];
  wgPublicKey: string;
  clientIp: string;
  deviceId?: string;
  transport: "wireguard" | "reality";
  status: "active" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}
