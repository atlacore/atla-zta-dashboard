/** GET/POST /ui/dns/nameservers, PUT/DELETE /ui/dns/nameservers/:id */
export interface DNSNameserverGroup {
  id: string;
  tenantId: string;
  name: string;
  nameservers: string[];
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DNSNameserverGroupCreateRequest {
  name: string;
  nameservers: string[];
  isPrimary?: boolean;
}

export interface DNSNameserverGroupUpdateRequest {
  name?: string;
  nameservers?: string[];
  isPrimary?: boolean;
}
