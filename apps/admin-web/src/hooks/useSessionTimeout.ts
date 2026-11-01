/**
 * Administrator Session Inactivity Timeout Hook
 * Enforces client-side session timeout with warning countdown before auto-revocation.
 * Traceability: FR-AUTH-007, NFR-SEC-004, FR-CONF-001, Rule 9
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../store/authContext';
import { useQuery } from '@tanstack/react-query';
import { securityApi } from '../api/security';

interface UseSessionTimeoutReturn {
  isWarningModalOpen: boolean;
  remainingSeconds: number;
  extendSession: () => void;
  terminateSession: () => Promise<void>;
}

export function useSessionTimeout(): UseSessionTimeoutReturn {
  const { user, accessToken, logout } = useAuth();

  // Fetch security policies for inactivity threshold
  const { data: policies } = useQuery({
    queryKey: ['security-policies'],
    queryFn: () => securityApi.getSecurityPolicies(),
    enabled: Boolean(accessToken),
  });

  const timeoutMinutes = policies?.sessionTimeoutMinutes ?? 15;
  const warningSeconds = policies?.warningCountdownSeconds ?? 60;

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningSeconds);

  const lastActivityRef = useRef<number>(Date.now());
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Extend session when user clicks "Continue Session"
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarningModalOpen(false);
    setRemainingSeconds(warningSeconds);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [warningSeconds]);

  // Terminate session
  const terminateSession = useCallback(async () => {
    setIsWarningModalOpen(false);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    await logout();
  }, [logout]);

  // Activity listener: track mouse, keyboard, touch events
  const handleUserActivity = useCallback(() => {
    // Only update if warning modal is not currently open
    if (!isWarningModalOpen) {
      lastActivityRef.current = Date.now();
    }
  }, [isWarningModalOpen]);

  useEffect(() => {
    if (!user || !accessToken) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }));

    // Check inactivity every 2 seconds
    const intervalMs = 2000;
    const warningThresholdMs = timeoutMinutes * 60 * 1000 - warningSeconds * 1000;

    const activityChecker = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;

      if (idleTime >= warningThresholdMs && !isWarningModalOpen) {
        setIsWarningModalOpen(true);
        setRemainingSeconds(warningSeconds);
      }
    }, intervalMs);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity));
      clearInterval(activityChecker);
    };
  }, [user, accessToken, timeoutMinutes, warningSeconds, isWarningModalOpen, handleUserActivity]);

  // Countdown timer when warning modal is open
  useEffect(() => {
    if (!isWarningModalOpen) {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          terminateSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isWarningModalOpen, terminateSession]);

  return {
    isWarningModalOpen,
    remainingSeconds,
    extendSession,
    terminateSession,
  };
}
