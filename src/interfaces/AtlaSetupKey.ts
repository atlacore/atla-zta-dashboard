/** What a setup key can still do: only "valid" enrolls. */
export type SetupKeyState = "valid" | "expired" | "exhausted" | "revoked";

/** SetupKey — GET /ui/setup-keys. Enrolls devices without a login; they act as its service user with its auto-groups. */
export interface SetupKey {
  id: string;
  tenantId: string;
  name: string;
  serviceUserId: string;
  reusable: boolean;
  /** 0 means unlimited (reusable keys only); a one-off key has 1. */
  usageLimit: number;
  usedCount: number;
  autoGroups: string[];
  expiresAt?: string;
  revokedAt?: string;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
  state: SetupKeyState;
}

/** POST /ui/setup-keys returns the key once. */
export interface SetupKeyCreateResponse extends SetupKey {
  key: string;
}

export interface SetupKeyCreateRequest {
  name: string;
  reusable: boolean;
  usageLimit?: number;
  autoGroups: string[];
  expiresAt?: string;
}
