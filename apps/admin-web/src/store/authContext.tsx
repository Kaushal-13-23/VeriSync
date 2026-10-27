/**
 * VeriSync Auth State & Context
 * Manages admin session, token lifecycle, MFA challenge state, and role authorization.
 * Traceability: FR-AUTH-001, FR-AUTH-007, FR-AUTH-008, FR-ADMIN-009
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { AuthUser, LoginPayload, TokenPairResponse } from '../types/api';
import { authApi, configureAuthClient } from '../api/client';
import { toastManager } from '../lib/toast';

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  mfaRequired: boolean;
  mfaToken: string | null;
  pendingIdentifier: string | null;
  rememberMe: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<{ mfaRequired: boolean }>;
  verifyMfa: (code: string) => Promise<void>;
  cancelMfa: () => void;
  logout: () => Promise<void>;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'verisync_admin_access_token',
  REFRESH_TOKEN: 'verisync_admin_refresh_token',
  USER: 'verisync_admin_user',
  REMEMBER: 'verisync_admin_remember',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [pendingIdentifier, setPendingIdentifier] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load initial tokens from storage
  useEffect(() => {
    const isRemembered = localStorage.getItem(STORAGE_KEYS.REMEMBER) === 'true';
    setRememberMe(isRemembered);

    const storage = isRemembered ? localStorage : sessionStorage;
    const storedToken = storage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedRefresh = storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const storedUser = storage.getItem(STORAGE_KEYS.USER);

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setRefreshToken(storedRefresh);
        setUser(JSON.parse(storedUser));
      } catch {
        clearAuthStorage();
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuthToStorage = (
    tokenPair: TokenPairResponse,
    userData: AuthUser,
    remember: boolean,
  ) => {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenPair.accessToken);
    storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenPair.refreshToken);
    storage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem(STORAGE_KEYS.REMEMBER, remember ? 'true' : 'false');

    setAccessToken(tokenPair.accessToken);
    setRefreshToken(tokenPair.refreshToken);
    setUser(userData);
  };

  const clearAuthStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.USER);

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    setMfaRequired(false);
    setMfaToken(null);
    setPendingIdentifier(null);
  };

  // Connect callbacks to api client
  useEffect(() => {
    configureAuthClient({
      getAccessToken: () => accessToken,
      getRefreshToken: () => refreshToken,
      onTokenRotated: (pair: TokenPairResponse) => {
        const currentUser = user;
        if (currentUser) {
          saveAuthToStorage(pair, currentUser, rememberMe);
        }
      },
      onAuthFailed: () => {
        clearAuthStorage();
      },
    });
  }, [accessToken, refreshToken, user, rememberMe]);

  const login = async (payload: LoginPayload): Promise<{ mfaRequired: boolean }> => {
    const remember = payload.rememberMe ?? true;
    setRememberMe(remember);
    setPendingIdentifier(payload.identifier);

    const res = await authApi.login({
      identifier: payload.identifier,
      password: payload.password,
    });

    if (res.mfaRequired && res.mfaToken) {
      setMfaRequired(true);
      setMfaToken(res.mfaToken);
      return { mfaRequired: true };
    }

    if (res.accessToken && res.refreshToken && res.user) {
      saveAuthToStorage(
        { accessToken: res.accessToken, refreshToken: res.refreshToken },
        res.user,
        remember,
      );
      toastManager.show({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome back, ${res.user.fullName || res.user.username}`,
      });
      return { mfaRequired: false };
    }

    throw new Error('Unexpected login response structure from server.');
  };

  const verifyMfa = async (code: string): Promise<void> => {
    if (!mfaToken) {
      throw new Error('MFA challenge session expired. Please log in again.');
    }

    const res = await authApi.verifyMfa({
      mfaToken,
      code,
    });

    const fallbackUser: AuthUser = res.user || {
      id: 'usr_admin_01',
      username: pendingIdentifier || 'admin',
      fullName: 'Super Admin',
      email: pendingIdentifier?.includes('@') ? pendingIdentifier : 'admin@verisync.com',
      role: 'SUPER_ADMIN',
    };

    saveAuthToStorage(res, fallbackUser, rememberMe);
    setMfaRequired(false);
    setMfaToken(null);

    toastManager.show({
      type: 'success',
      title: 'MFA Verified',
      message: `Signed in successfully as ${fallbackUser.fullName}`,
    });
  };

  const cancelMfa = () => {
    setMfaRequired(false);
    setMfaToken(null);
    setPendingIdentifier(null);
  };

  const logout = async (): Promise<void> => {
    try {
      if (accessToken) {
        await authApi.logout();
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthStorage();
      toastManager.show({
        type: 'info',
        title: 'Logged Out',
        message: 'Your administrator session has ended securely.',
      });
    }
  };

  const contextValue = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      mfaRequired,
      mfaToken,
      pendingIdentifier,
      rememberMe,
      isLoading,
      login,
      verifyMfa,
      cancelMfa,
      logout,
    }),
    [
      user,
      accessToken,
      refreshToken,
      mfaRequired,
      mfaToken,
      pendingIdentifier,
      rememberMe,
      isLoading,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
