import { contextBridge } from 'electron';

// Expose safe, minimal typed API bridge per SRS / prompt pack (nodeIntegration off, contextIsolation on)
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => '1.1.0',
  isKiosk: () => process.env.NODE_ENV === 'production',
  platform: process.platform,
});
