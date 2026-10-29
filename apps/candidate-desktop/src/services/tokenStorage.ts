/**
 * Secure Token Storage for Candidate Desktop
 * Non-negotiable rules:
 * - NFR-SEC-004: Ephemeral session tokens stored via secure storage (Electron safeStorage)
 * - NFR-SEC-005: No secrets or tokens stored in plaintext code or logs
 */

let inMemoryFallbackToken: string | null = null;
let inMemoryActiveSession: ActiveSessionMetadata | null = null;

export interface ActiveSessionMetadata {
  sessionId: string;
  assessmentId: string;
  title: string;
  candidateId: string;
  startedAt: string;
}

const ACTIVE_SESSION_STORAGE_KEY = 'verisync_active_session_recovery';

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

  /**
   * Session Recovery: Persist active exam session metadata
   * (FR-TIME-010, FR-ANS-007, NFR-REL-004)
   */
  async setActiveSession(metadata: ActiveSessionMetadata): Promise<void> {
    inMemoryActiveSession = metadata;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(metadata));
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }
  },

  async getActiveSession(): Promise<ActiveSessionMetadata | null> {
    if (inMemoryActiveSession) {
      return inMemoryActiveSession;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const item = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
        if (item) {
          const parsed = JSON.parse(item) as ActiveSessionMetadata;
          if (parsed?.sessionId) {
            inMemoryActiveSession = parsed;
            return parsed;
          }
        }
      } catch {
        // Fall back
      }
    }
    return null;
  },

  async clearActiveSession(): Promise<void> {
    inMemoryActiveSession = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
