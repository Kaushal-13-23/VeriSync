import { contextBridge, ipcRenderer } from 'electron';

/**
 * Minimal typed preload bridge per SRS / prompt pack
 * Non-negotiable rules:
 * - nodeIntegration: false, contextIsolation: true (NFR-SEC-001, NFR-SEC-005)
 * - Restrict bridge strictly to typed capability interfaces
 * - Multi-layer lockdown & security telemetry (FR-LAB-005, FR-LAB-006, FR-LAB-008, TC18)
 */

export interface VeriSyncBridge {
  getAppVersion: () => Promise<string>;
  getDeviceId: () => Promise<string>;
  isKiosk: () => Promise<boolean>;
  storeToken: (token: string) => Promise<boolean>;
  getToken: () => Promise<string | null>;
  clearToken: () => Promise<boolean>;
  checkProhibitedApps: (
    customDenylist?: string[],
  ) => Promise<{ hasProhibitedApps: boolean; apps: string[] }>;
  getSystemInfo: () => Promise<{ platform: string; arch: string; isWindows: boolean }>;
  writeLog: (entry: {
    level: string;
    message: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<boolean>;
  verifyIntegrity: () => Promise<{ isTampered: boolean; reason?: string }>;
  closeApp: () => Promise<void>;
  // Phase 6 Lockdown & Telemetry (FR-LAB-005, FR-LAB-006, FR-LAB-008, TC18)
  setExamActive: (isActive: boolean) => Promise<boolean>;
  isExamActive: () => Promise<boolean>;
  onWindowBlur: (callback: () => void) => () => void;
  onWindowMinimize: (callback: () => void) => () => void;
  onExitAttempted: (callback: () => void) => () => void;
  onSecurityAlert: (callback: (data: { eventType: string }) => void) => () => void;
}

const bridge: VeriSyncBridge = {
  getAppVersion: () => ipcRenderer.invoke('verisync:getAppVersion'),
  getDeviceId: () => ipcRenderer.invoke('verisync:getDeviceId'),
  isKiosk: () => ipcRenderer.invoke('verisync:isKiosk'),
  storeToken: (token: string) => ipcRenderer.invoke('verisync:storeToken', token),
  getToken: () => ipcRenderer.invoke('verisync:getToken'),
  clearToken: () => ipcRenderer.invoke('verisync:clearToken'),
  checkProhibitedApps: (customDenylist?: string[]) =>
    ipcRenderer.invoke('verisync:checkProhibitedApps', customDenylist),
  getSystemInfo: () => ipcRenderer.invoke('verisync:getSystemInfo'),
  writeLog: (entry) => ipcRenderer.invoke('verisync:writeLog', entry),
  verifyIntegrity: () => ipcRenderer.invoke('verisync:verifyIntegrity'),
  closeApp: () => ipcRenderer.invoke('verisync:closeApp'),
  // Phase 6 Lockdown Implementations
  setExamActive: (isActive: boolean) => ipcRenderer.invoke('verisync:setExamActive', isActive),
  isExamActive: () => ipcRenderer.invoke('verisync:isExamActive'),
  onWindowBlur: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('verisync:onWindowBlur', handler);
    return () => {
      ipcRenderer.removeListener('verisync:onWindowBlur', handler);
    };
  },
  onWindowMinimize: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('verisync:onWindowMinimize', handler);
    return () => {
      ipcRenderer.removeListener('verisync:onWindowMinimize', handler);
    };
  },
  onExitAttempted: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('verisync:onExitAttempted', handler);
    return () => {
      ipcRenderer.removeListener('verisync:onExitAttempted', handler);
    };
  },
  onSecurityAlert: (callback: (data: { eventType: string }) => void) => {
    const handler = (_event: unknown, data: { eventType: string }) => callback(data);
    ipcRenderer.on('verisync:onSecurityAlert', handler);
    return () => {
      ipcRenderer.removeListener('verisync:onSecurityAlert', handler);
    };
  },
};

contextBridge.exposeInMainWorld('verisyncBridge', bridge);

// Maintain backwards compatibility with initial scaffold
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.1.0',
  isKiosk: () => process.env.NODE_ENV === 'production',
  platform: process.platform,
});
