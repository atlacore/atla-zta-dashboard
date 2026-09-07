/** GET/POST /ui/dns/zones, GET/PUT/DELETE /ui/dns/zones/:id */
export interface DNSZone {
  id: string;
  tenantId: string;
  domain: string;
  nameserverGroupId?: string;
  primaryNs: string;
  adminEmail: string;
  serial: number;
  refreshInterval: number;
  retryInterval: number;
  expireAfter: number;
  negativeCacheTtl: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DNSZoneCreateRequest {
  domain: string;
  nameserverGroupId?: string;
  primaryNs?: string;
  adminEmail?: string;
  refreshInterval?: number;
  retryInterval?: number;
  expireAfter?: number;
  negativeCacheTtl?: number;
  isActive?: boolean;
}

export interface DNSZoneUpdateRequest {
  nameserverGroupId?: string;
  primaryNs?: string;
  adminEmail?: string;
  refreshInterval?: number;
  retryInterval?: number;
  expireAfter?: number;
  negativeCacheTtl?: number;
  isActive?: boolean;
}

export type DNSRecordType = "A" | "AAAA" | "CNAME" | "TXT";

/** GET/POST /ui/dns/records, PUT/DELETE /ui/dns/records/:id */
export interface DNSRecord {
  id: string;
  zoneId: string;
  tenantId: string;
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
  createdAt: string;
  updatedAt: string;
}

export interface DNSRecordCreateRequest {
  zoneId: string;
  name: string;
  type: DNSRecordType;
  value: string;
  ttl?: number;
}

export interface DNSRecordUpdateRequest {
  value?: string;
  ttl?: number;
}
