/** GET/PUT /ui/dns/swg — one row per tenant */
export interface SWGPolicy {
  tenantId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SWGPolicyUpdateRequest {
  enabled: boolean;
}

/** GET/POST/DELETE /ui/dns/swg/blocklist */
export interface SWGBlockedDomain {
  id: string;
  tenantId: string;
  domain: string;
  createdAt: string;
}

export interface SWGBlockedDomainCreateRequest {
  domain: string;
}
