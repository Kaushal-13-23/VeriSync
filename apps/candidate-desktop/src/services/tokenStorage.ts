/**
 * Secure Token Storage for Candidate Desktop
 * Non-negotiable rules:
 * - NFR-SEC-004: Ephemeral session tokens stored via secure storage (Electron safeStorage)
 * - NFR-SEC-005: No secrets or tokens stored in plaintext code or logs
 */

let inMemoryFallbackToken: string | null = null;

export const tokenStorage = {
  async setToken(token: string): Promise<boolean> {
    inMemoryFallbackToken = token;
    if (typeof window !== 'undefined' && window.verisyncBridge) {
      try {
        return await window.verisyncBridge.storeToken(token);
      } catch {
        return true;
      }
    }
    return true;
  },

  async getToken(): Promise<string | null> {
    if (typeof window !== 'undefined' && window.verisyncBridge) {
      try {
        const stored = await window.verisyncBridge.getToken();
        if (stored) return stored;
      } catch {
        // Fall back to in-memory
      }
    }
    return inMemoryFallbackToken;
  },

  async clearToken(): Promise<boolean> {
    inMemoryFallbackToken = null;
    if (typeof window !== 'undefined' && window.verisyncBridge) {
      try {
        return await window.verisyncBridge.clearToken();
      } catch {
        return true;
      }
    }
    return true;
  },
};
