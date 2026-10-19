/** GET /ui/mdm - external posture (MDM) providers as seen by the caller's tenant, owner/admin only. */
export interface MDMOverview {
  providers: MDMProvider[];
}

export interface MDMProvider {
  name: string;
  /** Enabled in the server config, for the whole deployment rather than per tenant. */
  configured: boolean;
  /** Host only, never the full URL or any credential. */
  baseHost?: string;
  /** The tenant's devices with a cached score, and how many of them are compliant. */
  devices: number;
  compliant: number;
  lastSyncAt?: string;
  oldestSyncAt?: string;
}
