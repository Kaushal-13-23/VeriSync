import { contextBridge, ipcRenderer } from 'electron';

/**
 * Minimal typed preload bridge per SRS / prompt pack
 * Non-negotiable rules:
 * - nodeIntegration: false, contextIsolation: true (NFR-SEC-001, NFR-SEC-005)
 * - Restrict bridge strictly to typed capability interfaces
 */

export interface VeriSyncBridge {
  getAppVersion: () => Promise<string>;
  getDeviceId: () => Promise<string>;
  isKiosk: () => Promise<boolean>;
  storeToken: (token: string) => Promise<boolean>;
  getToken: () => Promise<string | null>;
  clearToken: () => Promise<boolean>;
  checkProhibitedApps: () => Promise<{ hasProhibitedApps: boolean; apps: string[] }>;
  getSystemInfo: () => Promise<{ platform: string; arch: string; isWindows: boolean }>;
  writeLog: (entry: {
    level: string;
    message: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<boolean>;
  verifyIntegrity: () => Promise<{ isTampered: boolean; reason?: string }>;
  closeApp: () => Promise<void>;
}

const bridge: VeriSyncBridge = {
  getAppVersion: () => ipcRenderer.invoke('verisync:getAppVersion'),
  getDeviceId: () => ipcRenderer.invoke('verisync:getDeviceId'),
  isKiosk: () => ipcRenderer.invoke('verisync:isKiosk'),
  storeToken: (token: string) => ipcRenderer.invoke('verisync:storeToken', token),
  getToken: () => ipcRenderer.invoke('verisync:getToken'),
  clearToken: () => ipcRenderer.invoke('verisync:clearToken'),
  checkProhibitedApps: () => ipcRenderer.invoke('verisync:checkProhibitedApps'),
  getSystemInfo: () => ipcRenderer.invoke('verisync:getSystemInfo'),
  writeLog: (entry) => ipcRenderer.invoke('verisync:writeLog', entry),
  verifyIntegrity: () => ipcRenderer.invoke('verisync:verifyIntegrity'),
  closeApp: () => ipcRenderer.invoke('verisync:closeApp'),
};

contextBridge.exposeInMainWorld('verisyncBridge', bridge);

// Maintain backwards compatibility with initial scaffold
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.1.0',
  isKiosk: () => process.env.NODE_ENV === 'production',
  platform: process.platform,
});
