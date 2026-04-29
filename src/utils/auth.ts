const TOKEN_KEY = "atla-user-token";

const isClient = typeof window !== "undefined";

export const auth = {
  getToken(): string | null {
    if (!isClient) return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    if (!isClient) return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    if (!isClient) return;
    localStorage.removeItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
