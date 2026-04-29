// Role as both a value object (for runtime comparisons) and a type
export const Role = {
  Owner: "owner",
  Admin: "admin",
  Auditor: "auditor",
  Member: "member",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export interface User {
  id: string;
  tenantId: string;
  extSub: string;
  email?: string;
  /** Preferred display name — use this. */
  displayName?: string;
  /** @deprecated use displayName */
  name?: string;
  role: Role;
  isBlocked: boolean;
  /** @deprecated use isBlocked */
  is_blocked?: boolean;
  createdAt: string;
  updatedAt: string;

  // Legacy NetBird fields — kept for backward compat, not populated by Atla backend
  /** @deprecated not used in Atla ZTA */
  auto_groups?: string[];
  /** @deprecated not used in Atla ZTA */
  is_service_user?: boolean;
  /** @deprecated not used in Atla ZTA */
  is_current?: boolean;
  /** @deprecated not used in Atla ZTA */
  last_login?: string;
  /** @deprecated not used in Atla ZTA */
  status?: string;
  /** @deprecated not used in Atla ZTA */
  pending?: boolean;
}

// Legacy invite types — not used by Atla ZTA backend, kept for type-compat
export interface UserInvite {
  id: string;
  email: string;
  role?: string;
  auto_groups?: string[];
  expired?: boolean;
  [key: string]: unknown;
}
export interface UserInviteInfo {
  [key: string]: unknown;
}
export interface UserInviteAcceptResponse {
  [key: string]: unknown;
}
export interface UserInviteRegenerateResponse {
  [key: string]: unknown;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: Role;
  isBlocked?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
