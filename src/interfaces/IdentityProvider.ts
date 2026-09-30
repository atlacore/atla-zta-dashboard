// Matches schemas.IdentityProviderResponse / CreateRequest / UpdateRequest.
// The backend only ever stores type: "oidc" — SSOIdentityProviderType below is
// a display-only guess (from the issuer hostname) for which icon to show.

export type SSOIdentityProviderType =
  | "oidc"
  | "zitadel"
  | "entra"
  | "google"
  | "okta"
  | "pocketid"
  | "microsoft"
  | "authentik"
  | "keycloak";

// guessSSOIdentityProviderType infers a display icon from the issuer's host -
// purely cosmetic, never sent to or read from the backend.
export const guessSSOIdentityProviderType = (
  issuer: string,
): SSOIdentityProviderType => {
  const host = issuer.toLowerCase();
  if (host.includes("okta.com")) return "okta";
  if (host.includes("accounts.google.com")) return "google";
  if (host.includes("login.microsoftonline.com") || host.includes("sts.windows.net")) return "entra";
  if (host.includes("zitadel")) return "zitadel";
  if (host.includes("pocketid")) return "pocketid";
  if (host.includes("authentik")) return "authentik";
  if (host.includes("keycloak")) return "keycloak";
  return "oidc";
};

export interface IdentityProvider {
  id: string;
  tenantId: string;
  type: "oidc";
  name: string;
  issuer: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  groupsClaim: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  discoveryFetchedAt?: string;
  discoveryExpiresAt?: string;
  autoProvision: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // loginUrl skips straight into the OIDC flow; dashboardLoginUrl lands on
  // /login pre-filtered to this tenant - share that one with your users.
  loginUrl: string;
  dashboardLoginUrl: string;
}

export interface IdentityProviderCreateRequest {
  name: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  groupsClaim?: string;
  autoProvision?: boolean;
}

export interface IdentityProviderUpdateRequest {
  name?: string;
  clientSecret?: string;
  autoProvision?: boolean;
  isActive?: boolean;
}

// PublicIdentityProvider matches schemas.PublicIdentityProvider - the
// pre-auth, cross-tenant listing shown as "Sign in with X" on /login
export interface PublicIdentityProvider {
  id: string;
  name: string;
  loginUrl: string;
}
