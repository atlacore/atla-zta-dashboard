const STORAGE_KEY = "atla-login-redirect";

/** A path on this dashboard, never another origin ("//host", "/\host" or a full URL fall back to "/"). */
export function safeRedirect(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

/** Kept across the OIDC round trip, which comes back to /oidc/callback without the redirect. */
export function rememberLoginRedirect(path: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, safeRedirect(path));
  } catch {
    // private mode: the user lands on "/" after the provider
  }
}

export function takeLoginRedirect(): string {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return safeRedirect(path);
  } catch {
    return "/";
  }
}
