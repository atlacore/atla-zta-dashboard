/** SDKKey — returned from GET /ui/sdk-keys list. Never includes raw key or hash. */
export interface SDKKey {
  id: string;
  name: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

/**
 * SetupKey — legacy alias for backward compatibility with old NetBird-derived code.
 * @deprecated Use SDKKey for new code.
 */
export type SetupKey = SDKKey & {
  key?: string;
  expires?: Date;
  last_used?: Date;
  revoked?: boolean;
  state?: string;
  type?: string;
  used_times?: number;
  valid?: boolean;
  auto_groups?: string[];
  expires_in?: number;
  usage_limit?: number | null;
  ephemeral?: boolean;
  allow_extra_dns_labels?: boolean;
};

/** POST /ui/sdk-keys body */
export interface SDKKeyCreateRequest {
  name: string;
  expiresAt?: string;
}

/** Returned once on key creation — raw key is never shown again. */
export interface SDKKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  expiresAt?: string;
  createdAt: string;
}
