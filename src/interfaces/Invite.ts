import { Role } from "@/interfaces/User";

/** Invite — returned from GET /ui/users/invites. Never includes the token or its hash */
export interface Invite {
  id: string;
  extSub: string;
  role: Role;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

/** POST /ui/users/invites body */
export interface InviteCreateRequest {
  extSub: string;
  role: Role;
  expiresAt?: string;
}

/** Returned once on invite creation — raw token is never shown again */
export interface InviteCreateResponse {
  id: string;
  extSub: string;
  role: Role;
  token: string;
  expiresAt: string;
  createdAt: string;
}
