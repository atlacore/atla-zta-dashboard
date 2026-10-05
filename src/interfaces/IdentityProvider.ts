// Matches schemas.IdentityProviderResponse / CreateRequest / UpdateRequest.
// The backend stores type: "oidc" | "ldap" — SSOIdentityProviderType below is
// a display-only guess (from the issuer hostname, or "ldap" directly) for
// which icon to show.

export type IdentityProviderType = "oidc" | "ldap";

export type SSOIdentityProviderType =
  | "oidc"
  | "ldap"
  | "zitadel"
  | "entra"
  | "google"
  | "okta"
  | "pocketid"
  | "microsoft"
  | "authentik"
  | "keycloak";

// guessSSOIdentityProviderType infers a display icon from the issuer's host -
// purely cosmetic, never sent to or read from the backend. LDAP connections
// have no issuer, so callers should check provider.type === "ldap" first.
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

// providerIconType picks the right icon key for a connection, regardless of
// its type — ldap has no issuer to guess from.
export const providerIconType = (provider: {
  type: IdentityProviderType;
  issuer?: string;
}): SSOIdentityProviderType =>
  provider.type === "ldap" ? "ldap" : guessSSOIdentityProviderType(provider.issuer ?? "");

// LDAP_TLS_MODES are the connection's transport options, shown in that order.
export const LDAP_TLS_MODES = ["starttls", "ldaps", "none"] as const;
export type LDAPTLSMode = (typeof LDAP_TLS_MODES)[number];

// LDAP_PORTS are the only ports a production AD/LDAP server listens on,
// mirroring the backend's validation.In(389, 636, 3268, 3269).
export const LDAP_PORTS = [389, 636, 3268, 3269] as const;

export interface IdentityProvider {
  id: string;
  tenantId: string;
  type: IdentityProviderType;
  name: string;

  issuer?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  groupsClaim?: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  jwksUri?: string;
  discoveryFetchedAt?: string;
  discoveryExpiresAt?: string;

  ldapHost?: string;
  ldapPort?: number;
  ldapTlsMode?: LDAPTLSMode;
  ldapBindDn?: string;
  ldapBaseDn?: string;
  ldapUserFilter?: string;
  ldapGroupBaseDn?: string;
  ldapGroupFilter?: string;
  ldapEmailAttr?: string;
  ldapUsernameAttr?: string;

  autoProvision: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // loginUrl is a redirect starter for oidc, a POST target for ldap;
  // dashboardLoginUrl lands on /login pre-filtered to this tenant - share
  // that one with your users.
  loginUrl: string;
  dashboardLoginUrl: string;
}

export interface IdentityProviderCreateRequest {
  type?: IdentityProviderType;
  name: string;

  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  groupsClaim?: string;

  ldapHost?: string;
  ldapPort?: number;
  ldapTlsMode?: LDAPTLSMode;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapBaseDn?: string;
  ldapUserFilter?: string;
  ldapGroupBaseDn?: string;
  ldapGroupFilter?: string;
  ldapEmailAttr?: string;
  ldapUsernameAttr?: string;

  autoProvision?: boolean;
}

export interface IdentityProviderUpdateRequest {
  name?: string;
  clientSecret?: string;
  autoProvision?: boolean;
  isActive?: boolean;

  ldapHost?: string;
  ldapPort?: number;
  ldapTlsMode?: LDAPTLSMode;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapBaseDn?: string;
  ldapUserFilter?: string;
  ldapGroupBaseDn?: string;
  ldapGroupFilter?: string;
}

// PublicIdentityProvider matches schemas.PublicIdentityProvider - the
// pre-auth, cross-tenant listing shown on /login. Type tells the login page
// whether to follow loginUrl as a redirect (oidc) or POST to it (ldap).
export interface PublicIdentityProvider {
  id: string;
  type: IdentityProviderType;
  name: string;
  loginUrl: string;
}
